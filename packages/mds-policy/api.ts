/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import express from 'express'
import { isProviderId, providerName } from 'mds-providers'
import Joi from '@hapi/joi'
import joiToJsonSchema from 'joi-to-json-schema'
import { Policy, UUID, Geography } from 'mds'
import db from 'mds-db'
import { VEHICLE_TYPES } from 'mds-enums'
import { isUUID, now, pathsFor } from 'mds-utils'
import { ServerError } from 'mds-api-helpers'
import log from 'mds-logger'
import { PolicyApiRequest, PolicyApiResponse } from './types'

log.startup()

function api(app: express.Express): express.Express {
  /**
   * Policy-specific middleware to extract provider_id into locals, do some logging, etc.
   */
  app.use((req: PolicyApiRequest, res: PolicyApiResponse, next: express.NextFunction) => {
    try {
      // verify presence of provider_id
      if (!(req.path.includes('/health') || req.path === '/' || req.path === '/schema/policy')) {
        if (res.locals.claims) {
          const { provider_id, scope } = res.locals.claims

          // no test access without auth
          if (req.path.includes('/test/')) {
            if (!scope || !scope.includes('test:all')) {
              return res.status(403).send({ result: `no test access without test:all scope (${scope})` })
            }
          }

          // no admin access without auth
          if (req.path.includes('/admin/')) {
            if (!scope || !scope.includes('admin:all')) {
              /* istanbul ignore next */
              return res.status(403).send({ result: `no admin access without admin:all scope (${scope})` })
            }
          }

          /* istanbul ignore next */
          if (!provider_id) {
            log.warn('Missing provider_id in', req.originalUrl)
            return res.status(400).send({ result: 'missing provider_id' })
          }

          /* istanbul ignore next */
          if (!isUUID(provider_id)) {
            log.warn(req.originalUrl, 'bogus provider_id', provider_id)
            return res.status(400).send({ result: `invalid provider_id ${provider_id} is not a UUID` })
          }

          if (!isProviderId(provider_id)) {
            return res.status(400).send({
              result: `invalid provider_id ${provider_id} is not a known provider`
            })
          }

          log.info(providerName(provider_id), req.method, req.originalUrl)
        } else {
          return res.status(401).send('Unauthorized')
        }
      }
    } catch (err) {
      /* istanbul ignore next */
      log.error(req.originalUrl, 'request validation fail:', err.stack)
    }
    next()
  })

  app.get(pathsFor('/health'), (req, res) => {
    res.status(200).send({
      // TODO use db health too ... others?
      result: 'we good bruh'
    })
  })

  app.get(pathsFor('/policies'), (req, res) => {
    // TODO extract start/end applicability
    // TODO filter by start/end applicability
    const { start_date = now(), end_date = now() } = req.query
    log.info('read /policies', req.query, start_date, end_date)
    if (start_date > end_date) {
      res.status(400).send({ result: 'start_date after end_date' })
      return
    }
    db.readPolicies({ start_date, end_date })
      .then(
        (policies: Policy[]) => {
          log.info('read policies (all)', policies.length)
          // filter here.  consider filtering in db?
          const prev_policies: UUID[] = policies.reduce((prev_policies_acc: UUID[], policy: Policy) => {
            if (policy.prev_policies) {
              prev_policies_acc.push(...policy.prev_policies)
            }
            return prev_policies_acc
          }, [])
          const active = policies.filter(p => {
            // overlapping segment logic
            const p_start_date = p.start_date
            const p_end_date = p.end_date || Number.MAX_SAFE_INTEGER
            return end_date >= p_start_date && p_end_date >= start_date && !prev_policies.includes(p.policy_id)
          })
          res.status(200).send({ policies: active })
        },
        /* istanbul ignore next */ (err: Error) => {
          log.error('failed to read policies', err)
          res.status(404).send({
            result: 'not found'
          })
        }
      )
      .catch((ex: Error) => /* istanbul ignore next */ {
        log.error(ex)
        res.status(500).send(new ServerError())
      })
  })

  app.get(pathsFor('/policies/:policy_id'), (req, res) => {
    const { policy_id } = req.params
    db.readPolicies({ policy_id })
      .then(
        (policies: Policy[]) => {
          if (policies.length > 0) {
            res.status(200).send(policies[0])
          } else {
            res.status(404).send({ result: 'not found' })
          }
        },
        (err: Error) => /* istanbul ignore next */ {
          log.error('failed to read one policy', err.stack)
          res.status(404).send({ result: 'not found' })
        }
      )
      .catch((ex: Error) => /* istanbul ignore next */ {
        log.error(ex)
        res.status(500).send(new ServerError())
      })
  })

  app.get(pathsFor('/geographies/:geography_id'), (req, res) => {
    log.info('read geo', JSON.stringify(req.params))
    const { geography_id } = req.params
    log.info('read geo', geography_id)
    db.readGeographies({ geography_id })
      .then(
        (geographies: Geography[]) => {
          if (geographies.length > 0) {
            res.status(200).send({ geography: geographies[0] })
          } else {
            res.status(404).send({ result: 'not found' })
          }
        },
        (err: Error) => /* istanbul ignore next */ {
          log.error('failed to read geography', err.stack)
          res.status(404).send({ result: 'not found' })
        }
      )
      .catch((ex: Error) => /* istanbul ignore next */ {
        log.error(ex)
        res.status(500).send(new ServerError())
      })
  })

  // TODO build out validation of geojson NEIL

  const featureSchema = Joi.object()
    .keys({
      type: Joi.string()
        .valid(['Feature'])
        .required(),
      properties: Joi.object().required(),
      geometry: Joi.object().required()
    })
    .unknown(true) // TODO

  const featureCollectionSchema = Joi.object()
    .keys({
      type: Joi.string()
        .valid(['FeatureCollection'])
        .required(),
      features: Joi.array()
        .min(1)
        .items(featureSchema)
        .required()
    })
    .unknown(true) // TODO

  app.post(pathsFor('/admin/geographies/:geography_id'), (req, res) => {
    const geography = req.body
    const validation = Joi.validate(geography.geography_json, featureCollectionSchema)
    const details = validation.error ? validation.error.details : null
    if (details) {
      log.info('questionable geojson', details)
      res.status(422).send(details)
      return
    }

    db.writeGeography(geography)
      .then(
        () => {
          res.status(200).send({ result: `Successfully wrote geography of id ${geography.geography_id}` })
        },
        (err: Error) => /* istanbul ignore next */ {
          log.error('failed to write geography', err.stack)
          res.status(404).send({ result: 'not found' })
        }
      )
      .catch((ex: Error) => /* istanbul ignore next */ {
        log.error(ex)
        res.status(500).send(new ServerError())
      })
  })

  app.put(pathsFor('/admin/geographies/:geography_id'), (req: PolicyApiRequest, res: PolicyApiResponse) => {
    // TODO implement updating a non-published geography
    res.status(501)
  })

  app.delete(pathsFor('/admin/geographies/:geography_id'), (req: PolicyApiRequest, res: PolicyApiResponse) => {
    // TODO implement deleting a non-published geography
    res.status(501)
  })

  const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

  const ruleSchema = Joi.object().keys({
    name: Joi.string().required(),
    rule_id: Joi.string()
      .guid()
      .required(),
    rule_type: Joi.string()
      .valid(['count', 'time', 'speed', 'user'])
      .required(),
    rule_units: Joi.string().valid(['seconds', 'minutes', 'hours', 'mph', 'kph']),
    geographies: Joi.array().items(Joi.string().guid()),
    statuses: Joi.object().keys({
      available: Joi.array(),
      reserved: Joi.array(),
      unavailable: Joi.array(),
      removed: Joi.array(),
      inactive: Joi.array(),
      trip: Joi.array(),
      elsewhere: Joi.array()
    }),
    vehicle_types: Joi.array().items(Joi.string().valid(Object.values(VEHICLE_TYPES))),
    maximum: Joi.number(),
    minimum: Joi.number(),
    start_time: Joi.string(),
    end_time: Joi.string(),
    days: Joi.array().items(Joi.string().valid(DAYS_OF_WEEK)),
    messages: Joi.object(),
    value_url: Joi.string().uri()
  })

  const policySchema = Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().required(),
    policy_id: Joi.string()
      .guid()
      .required(),
    start_date: Joi.date()
      .timestamp('javascript')
      .required(),
    end_date: Joi.date()
      .timestamp('javascript')
      .allow(null),
    prev_policies: Joi.array()
      .items(Joi.string().guid())
      .allow(null),
    provider_ids: Joi.array()
      .items(Joi.string().guid())
      .allow(null),
    rules: Joi.array()
      .min(1)
      .items(ruleSchema)
      .required()
  })

  app.get(pathsFor('/schema/policy'), (req, res) => {
    res.status(200).send(joiToJsonSchema(policySchema))
  })

  app.post(pathsFor('/admin/policies/:policy_id'), (req, res) => {
    const policy = req.body
    const validation = Joi.validate(policy, policySchema)
    const details = validation.error ? validation.error.details : null

    if (details) {
      log.error('questionable policy json', details)
      res.status(422).send(details)
      return
    }
    db.writePolicy(policy)
      .then(
        () => {
          res.status(200).send({ result: `successfully wrote policy of id ${policy.policy_id}` })
        },
        (err: Error) => /* istanbul ignore next */ {
          log.error('failed to write geography', err.stack)
          res.status(404).send({ result: 'not found' })
        }
      )
      .catch((ex: Error) => /* istanbul ignore next */ {
        log.error(ex)
        res.status(500).send(new ServerError())
      })
  })

  // TODO publish geography

  // TODO publish policy

  app.put(pathsFor('/admin/policies/:policy_id'), (req, res) => {
    // TODO implement updating a non-published policy
    const policy = req.body
    const validation = Joi.validate(policy, policySchema)
    const details = validation.error ? validation.error.details : null

    // TODO is basically identical to POST policy

    if (details) {
      log.info('policy JSON', details)
      res.status(422).send(details)
      return
    }
    db.writePolicy(policy)
      .then(
        () => {
          res.status(200).send({ result: `successfully wrote policy of id ${policy.policy_id}` })
        },
        (err: Error) => /* istanbul ignore next */ {
          log.error('failed to write geography', err.stack)
          res.status(404).send({ result: 'not found' })
        }
      )
      .catch((ex: Error) => /* istanbul ignore next */ {
        log.error(ex)
        res.status(500).send(new ServerError())
      })
  })

  app.delete(pathsFor('/admin/policies/:policy_id'), (req, res) => {
    // TODO implement deletion of a non-published policy
    res.status(501)
  })

  app.get(pathsFor('/test/initialize'), (req, res) => {
    Promise.all([db.initialize()])
      .then(
        kind => {
          res.send({
            result: `Policy initialized (${kind})`
          })
        },
        err => {
          /* istanbul ignore next */
          log.error('initialize failed', err).then(() => {
            res.status(500).send(new ServerError())
          })
        }
      )
      .catch(ex => /* istanbul ignore next */ {
        log.error('initialize exception', ex).then(() => {
          res.status(500).send(new ServerError())
        })
      })
  })

  app.get(pathsFor('/test/shutdown'), (req, res) => {
    Promise.all([db.shutdown()]).then(() => {
      log.info('shutdown complete (in theory)')
      res.send({ result: 'cache/stream/db shutdown done' })
    })
  })

  return app
}

export { api }
