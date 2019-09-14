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
import Joi from '@hapi/joi'
import { TEST1_PROVIDER_ID, TEST2_PROVIDER_ID, TEST4_PROVIDER_ID, isProviderId } from '@mds-core/mds-providers'
import { VEHICLE_TYPES, DAYS_OF_WEEK } from '@mds-core/mds-types'
import db from '@mds-core/mds-db'
import {
  now,
  pathsFor,
  ServerError,
  UUID_REGEX,
  NotFoundError,
  isUUID,
  BadParamsError,
  AlreadyPublishedError
} from '@mds-core/mds-utils'
import log from '@mds-core/mds-logger'

import { PolicyApiRequest, PolicyApiResponse } from './types'

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

function api(app: express.Express): express.Express {
  /**
   * Policy-specific middleware to extract provider_id into locals, do some logging, etc.
   */
  app.use(async (req: PolicyApiRequest, res: PolicyApiResponse, next: express.NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*')
    try {
      // TODO verify presence of agency_id
      if (!(req.path.includes('/health') || req.path === '/' || req.path === '/schema/policy')) {
        if (res.locals.claims) {
          const { provider_id } = res.locals.claims

          // TODO alter authorization code to look for an agency_id

          if (provider_id) {
            if (!isUUID(provider_id)) {
              await log.warn(req.originalUrl, 'invalid provider_id is not a UUID', provider_id)
              return res.status(400).send({
                result: `invalid provider_id ${provider_id} is not a UUID`
              })
            }

            if (!isProviderId(provider_id)) {
              return res.status(400).send({
                result: `invalid provider_id ${provider_id} is not a known provider`
              })
            }

            if (![TEST1_PROVIDER_ID, TEST2_PROVIDER_ID, TEST4_PROVIDER_ID].includes(provider_id)) {
              return res.status(401).send({ result: 'Unauthorized' })
            }
          }
        } else {
          return res.status(401).send('Unauthorized')
        }
      }
    } catch (err) {
      /* istanbul ignore next */
      await log.error(req.originalUrl, 'request validation fail:', err.stack)
    }
    next()
  })

  app.get(pathsFor('/policies'), async (req, res) => {
    const { start_date = now(), end_date = now(), get_published = null, get_unpublished = null } = req.query
    log.info('read /policies', req.query, start_date, end_date)
    if (start_date > end_date) {
      res.status(400).send({ result: 'start_date after end_date' })
      return
    }
    try {
      const policies = await db.readPolicies({ start_date, get_published, get_unpublished })

      // Let's not worry about filtering for just active policies at the moment.

      /*
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
      */
      res.status(200).send({ policies })
    } catch (err) {
      await log.error('failed to read policies', err)
      if (err instanceof BadParamsError) {
        res.status(400).send({
          result:
            'Cannot set both get_unpublished and get_published to be true. If you want all policies, set both params to false or do not send them.'
        })
      }
      res.status(404).send({
        result: 'not found'
      })
    }
  })

  app.post(pathsFor('/policies'), async (req, res) => {
    const policy = req.body
    const validation = Joi.validate(policy, policySchema)
    const details = validation.error ? validation.error.details : null

    if (details) {
      await log.error('invalid policy json', details)
      return res.status(400).send(details)
    }

    try {
      await db.writePolicy(policy)
      return res.status(201).send({ policy })
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).send({ result: `policy ${policy.policy_id} already exists! Did you mean to PUT?` })
      }
      /* istanbul ignore next */
      await log.error('failed to write policy', err)
      /* istanbul ignore next */
      return res.status(500).send({ error: new ServerError(err) })
    }
  })

  app.post(pathsFor('/policies/:policy_id/publish'), async (req, res) => {
    const { policy_id } = req.params
    try {
      await db.publishPolicy(policy_id)
      return res.status(200).send({ result: `successfully wrote policy of id ${policy_id}` })
    } catch (err) {
      if (err instanceof NotFoundError) {
        if (err.message.includes('geography')) {
          const geography_id = err.message.match(UUID_REGEX)
          return res.status(404).send({ error: `geography_id ${geography_id} not_found` })
        }
        if (err.message.includes('policy')) {
          return res.status(404).send({ error: `policy_id ${policy_id} not_found` })
        }
      }
      if (err instanceof AlreadyPublishedError) {
        return res.status(409).send({ error: `policy_id ${policy_id} has already been published` })
      }
      /* istanbul ignore next */
      await log.error('failed to publish policy', err.stack)
      /* istanbul ignore next */
      return res.status(404).send({ result: 'not found' })
    }
  })

  app.put(pathsFor('/policies/:policy_id'), async (req, res) => {
    const policy = req.body
    const validation = Joi.validate(policy, policySchema)
    const details = validation.error ? validation.error.details : null

    if (details) {
      return res.status(400).send(details)
    }

    try {
      await db.editPolicy(policy)
      return res.status(200).send({ result: `successfully edited policy ${policy}` })
    } catch (err) {
      if (err instanceof NotFoundError) {
        return res.status(404).send({ error: 'not found' })
      }
      if (err instanceof AlreadyPublishedError) {
        return res.status(409).send({ error: `policy ${policy.policy_id} has already been published!` })
      }
      /* istanbul ignore next */
      await log.error('failed to edit policy', err.stack)
      /* istanbul ignore next */
      if (err instanceof NotFoundError) {
        res.status(404).send({ result: 'not found' })
      } else {
        res.status(500).send(new ServerError(err))
      }
    }
  })

  app.delete(pathsFor('/policies/:policy_id'), async (req, res) => {
    const { policy_id } = req.params
    try {
      await db.deletePolicy(policy_id)
      return res.status(200).send({ result: `successfully deleted policy of id ${policy_id}` })
    } catch (err) {
      /* istanbul ignore next */
      await log.error('failed to delete policy', err.stack)
      /* istanbul ignore next */
      return res.status(404).send({ result: 'policy either not found, or has already been published' })
    }
  })

  app.get(pathsFor('/policies/meta/'), async (req, res) => {
    const { start_date = now(), end_date = now(), get_published = null, get_unpublished = null } = req.query
    log.info('read /policies/meta', req.query, start_date, end_date)
    if (start_date > end_date) {
      res.status(400).send({ result: 'start_date after end_date' })
      return
    }
    try {
      const metadata = await db.readBulkPolicyMetadata({ start_date, get_published, get_unpublished })

      res.status(200).send(metadata)
    } catch (err) {
      await log.error('failed to read policies', err)
      if (err instanceof BadParamsError) {
        res.status(400).send({
          result:
            'Cannot set both get_unpublished and get_published to be true. If you want all policy metadata, set both params to false or do not send them.'
        })
      }
      res.status(404).send({
        result: 'not found'
      })
    }
  })

  app.get(pathsFor('/policies/:policy_id'), async (req, res) => {
    const { policy_id } = req.params
    try {
      const policies = await db.readPolicies({ policy_id })
      if (policies.length > 0) {
        res.status(200).send(policies[0])
      } else {
        res.status(404).send({ result: 'not found' })
      }
    } catch (err) {
      await log.error('failed to read one policy', err)
      res.status(404).send({ result: 'not found' })
    }
  })

  app.get(pathsFor('/policies/:policy_id/meta'), async (req, res) => {
    const { policy_id } = req.params
    try {
      const result = await db.readSinglePolicyMetadata(policy_id)
      return res.status(200).send(result)
    } catch (err) {
      await log.error('failed to read policy metadata', err.stack)
      return res.status(404).send({ result: 'not found' })
    }
  })

  app.put(pathsFor('/policies/:policy_id/meta'), async (req, res) => {
    const policy_metadata = req.body
    try {
      await db.updatePolicyMetadata(policy_metadata)
      return res.status(201).send({ policy_metadata })
    } catch (updateErr) {
      if (updateErr instanceof NotFoundError) {
        try {
          await db.writePolicyMetadata(policy_metadata)
          return res.status(201).send({ policy_metadata })
        } catch (writeErr) {
          await log.error('failed to write policy metadata', writeErr.stack)
          return res.status(500).send(new ServerError())
        }
      } else {
        return res.status(500).send(new ServerError())
      }
    }
  })

  app.get(pathsFor('/geographies/meta/'), async (req, res) => {
    const get_read_only = req.query === 'true'

    log.info('read /geographies/meta', req.query)
    try {
      const metadata = await db.readBulkGeographyMetadata({ get_read_only })
      res.status(200).send(metadata)
    } catch (err) {
      await log.error('failed to read geography metadata', err)
      res.status(404).send({
        result: 'not found'
      })
    }
  })

  app.get(pathsFor('/geographies/:geography_id'), async (req, res) => {
    log.info('read geo', JSON.stringify(req.params))
    const { geography_id } = req.params
    log.info('read geo', geography_id)
    try {
      const geography = await db.readSingleGeography(geography_id)
      res.status(200).send({ geography })
    } catch (err) {
      await log.error('failed to read geography', err.stack)
      res.status(404).send({ result: 'not found' })
    }
  })

  app.post(pathsFor('/geographies/'), async (req, res) => {
    const geography = req.body
    const validation = Joi.validate(geography.geography_json, featureCollectionSchema)
    const details = validation.error ? validation.error.details : null
    if (details) {
      return res.status(400).send(details)
    }

    try {
      await db.writeGeography(geography)
      return res.status(201).send({ geography })
    } catch (err) {
      if (err.code === '23505') {
        return res
          .status(409)
          .send({ result: `geography ${geography.geography_id} already exists! Did you mean to PUT?` })
      }
      /* istanbul ignore next */
      await log.error('failed to write geography', err.stack)
      /* istanbul ignore next */
      return res.status(500).send(new ServerError(err))
    }
  })

  app.put(pathsFor('/geographies/:geography_id'), async (req, res) => {
    const geography = req.body
    const validation = Joi.validate(geography.geography_json, featureCollectionSchema)
    const details = validation.error ? validation.error.details : null
    if (details) {
      return res.status(400).send(details)
    }

    try {
      await db.editGeography(geography)
      return res.status(201).send({ geography })
    } catch (err) {
      await log.error('failed to write geography', err.stack)
      return res.status(404).send({ result: 'not found' })
    }
  })

  app.delete(pathsFor('/geographies/:geography_id'), async (req, res) => {
    const { geography_id } = req.params
    try {
      await db.deleteGeography(geography_id)
      return res.status(200).send({ result: `Successfully deleted geography of id ${geography_id}` })
    } catch (err) {
      await log.error('failed to delete geography', err.stack)
      return res.status(404).send({ result: 'geography either not found or already published' })
    }
  })

  app.get(pathsFor('/geographies/:geography_id/meta'), async (req, res) => {
    const { geography_id } = req.params
    try {
      const geography_metadata = await db.readSingleGeographyMetadata(geography_id)
      return res.status(200).send(geography_metadata)
    } catch (err) {
      await log.error('failed to read geography metadata', err.stack)
      return res.status(404).send({ result: 'not found' })
    }
  })

  app.put(pathsFor('/geographies/:geography_id/meta'), async (req, res) => {
    const geography_metadata = req.body
    const { geography_id } = req.params
    try {
      await db.writeGeographyMetadata(geography_metadata)
      return res.status(201).send({ result: `successfully wrote geography metadata of id ${geography_id}` })
    } catch (err) {
      await log.error('failed to write geography metadata', err.stack)
      return res.status(404).send({ result: 'not found' })
    }
  })
  return app
}

export { api }
