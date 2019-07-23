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
import { VEHICLE_TYPES, DAYS_OF_WEEK } from 'mds-enums'
import { isUUID, now, pathsFor, ServerError } from 'mds-utils'
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

  app.get(pathsFor('/policies'), async (req, res) => {
    // TODO extract start/end applicability
    // TODO filter by start/end applicability
    const { start_date = now(), end_date = now() } = req.query
    log.info('read /policies', req.query, start_date, end_date)
    if (start_date > end_date) {
      res.status(400).send({ result: 'start_date after end_date' })
      return
    }
    try {
      const policies: Policy[] = await db.readPolicies({ start_date, end_date })
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
    } catch (err) {
      log.error('failed to read policies', err)
      res.status(404).send({
        result: 'not found'
      })
    }
  })

  app.get(pathsFor('/policies/:policy_id'), async (req, res) => {
    const { policy_id } = req.params
    try {
      const policies: Policy[] = await db.readPolicies({ policy_id })
      if (policies.length > 0) {
        res.status(200).send(policies[0])
      } else {
        res.status(404).send({ result: 'not found' })
      }
    } catch (err) {
      log.error('failed to read one policy', err.stack)
      res.status(404).send({ result: 'not found' })
    }
  })

  app.get(pathsFor('/geographies/:geography_id'), async (req, res) => {
    log.info('read geo', JSON.stringify(req.params))
    const { geography_id } = req.params
    log.info('read geo', geography_id)
    try {
      const geographies: Geography[] = await db.readGeographies({ geography_id })
      if (geographies.length > 0) {
        res.status(200).send({ geography: geographies[0] })
      } else {
        res.status(404).send({ result: 'not found' })
      }
    } catch (err) {
      log.error('failed to read geography', err.stack)
      res.status(404).send({ result: 'not found' })
    }
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

  app.post(pathsFor('/admin/geographies/:geography_id'), async (req, res) => {
    const geography = req.body
    const validation = Joi.validate(geography.geography_json, featureCollectionSchema)
    const details = validation.error ? validation.error.details : null
    if (details) {
      log.info('questionable geojson', details)
      res.status(422).send(details)
      return
    }

    try {
      await db.writeGeography(geography)
      res.status(200).send({ result: `Successfully wrote geography of id ${geography.geography_id}` })
    } catch (err) {
      log.error('failed to write geography', err.stack)
      res.status(404).send({ result: 'not found' })
    }
  })

  app.put(pathsFor('/admin/geographies/:geography_id'), (req: PolicyApiRequest, res: PolicyApiResponse) => {
    // TODO implement updating a non-published geography
    res.status(501)
  })

  app.delete(pathsFor('/admin/geographies/:geography_id'), (req: PolicyApiRequest, res: PolicyApiResponse) => {
    // TODO implement deleting a non-published geography
    res.status(501)
  })

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
    days: Joi.array().items(Joi.string().valid(Object.values(DAYS_OF_WEEK))),
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

  app.post(pathsFor('/admin/policies/:policy_id'), async (req, res) => {
    const policy = req.body
    const validation = Joi.validate(policy, policySchema)
    const details = validation.error ? validation.error.details : null

    if (details) {
      log.error('questionable policy json', details)
      res.status(422).send(details)
      return
    }

    try {
      await db.writePolicy(policy)
      res.status(200).send({ result: `successfully wrote policy of id ${policy.policy_id}` })
    } catch (err) {
      log.error('failed to write geography', err.stack)
      res.status(404).send({ result: 'not found' })
    }
  })

  // TODO publish geography

  // TODO publish policy

  app.put(pathsFor('/admin/policies/:policy_id'), async (req, res) => {
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
    try {
      await db.editPolicy(policy)
      res.status(200).send({ result: `successfully edited policy of id ${policy.policy_id}` })
    } catch (err) {
      log.error('failed to edit policy', err.stack)
      res.status(404).send({ result: 'not found' })
    }
  })

  app.delete(pathsFor('/admin/policies/:policy_id'), (req, res) => {
    // TODO implement deletion of a non-published policy
    res.status(501)
  })

  app.get(pathsFor('/test/initialize'), async (req, res) => {
    try {
      const kind = await Promise.all([db.initialize()])
      res.send({
        result: `Policy initialized (${kind})`
      })
    } catch (err) {
      await log.error('initialize failed', err)
      res.status(500).send(new ServerError())
    }
  })

  app.get(pathsFor('/test/shutdown'), async (req, res) => {
    await Promise.all([db.shutdown()])
    log.info('shutdown complete (in theory)')
    res.send({ result: 'cache/stream/db shutdown done' })
  })

  return app
}

export { api }
