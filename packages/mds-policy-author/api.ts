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

/* TODO
 * -- Finish testing deletion of unpublished policies
 * -- Test deletion of un/published geographies
 * -- Test that when a policy is published, the related geographies are set to read only
 * -- Write endpoints for CRUD of policy and geography metadata endpoints
 */

import express from 'express'
import Joi from '@hapi/joi'
import joiToJsonSchema from 'joi-to-json-schema'
import { Policy, UUID, Geography, VEHICLE_TYPES, DAYS_OF_WEEK } from '@mds-core/mds-types'
import db from '@mds-core/mds-db'
import { now, pathsFor, ServerError } from '@mds-core/mds-utils'
import log from '@mds-core/mds-logger'
import { PolicyApiRequest, PolicyApiResponse } from './types'

log.startup()

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
  app.use((req: PolicyApiRequest, res: PolicyApiResponse, next: express.NextFunction) => {
    try {
      // TODO verify presence of agency_id
      if (!(req.path.includes('/health') || req.path === '/' || req.path === '/schema/policy')) {
        if (res.locals.claims) {
          const { scope } = res.locals.claims

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

          // TODO alter authorization code to look for an agency_id
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

  // HOUSEKEEPING
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

  app.get(pathsFor('/schema/policy'), (req, res) => {
    res.status(200).send(joiToJsonSchema(policySchema))
  })

  // POLICIES
  // POLICY GETS

  app.get(pathsFor('/policies'), async (req, res) => {
    const { start_date = now(), end_date = now(), unpublished } = req.query
    log.info('read /policies', req.query, start_date, end_date)
    if (start_date > end_date) {
      res.status(400).send({ result: 'start_date after end_date' })
      return
    }

    const get_unpublished = unpublished !== undefined

    try {
      const policies: Policy[] = await db.readPolicies({ start_date, end_date, get_unpublished })
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

  // POLICY POSTS

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
      log.error('failed to write policy', err.stack)
      res.status(404).send({ result: 'not found' })
    }
  })

  app.post(pathsFor('/admin/policies/:policy_id/publish'), async (req, res) => {
    const { policy_id } = req.params

    try {
      await db.publishPolicy(policy_id)
      res.status(200).send({ result: `successfully wrote policy of id ${policy_id}` })
    } catch (err) {
      log.error('failed to publish policy', err.stack)
      res.status(404).send({ result: 'not found' })
    }
  })

  // POLICY PUTS

  // edit a policy
  app.put(pathsFor('/admin/policies/:policy_id'), async (req, res) => {
    const policy = req.body
    const validation = Joi.validate(policy, policySchema)
    const details = validation.error ? validation.error.details : null
    log.info('editing that damn policy', policy, details)

    if (details) {
      log.info('policy JSON', details)
      res.status(422).send(details)
      return
    }
    try {
      await db.editPolicy(policy)
      log.info('editing the policy succeeded', policy, details)
      res.status(200).send({ result: `successfully edited policy ${policy}` })
    } catch (err) {
      log.error('failed to edit policy', err.stack)
      res.status(404).send({ result: 'not found' })
    }
  })

  // POLICIES DELETES

  app.delete(pathsFor('/admin/policies/:policy_id'), async (req, res) => {
    const { policy_id } = req.params
    log.info('deleting this dumb policy')
    try {
      await db.deletePolicy(policy_id)
      res.status(200).send({ result: `successfully deleted policy of id ${policy_id}` })
      log.info('deleting this dumb policy success')
    } catch (err) {
      log.error('failed to delete policy', err.stack)
      res.status(404).send({ result: 'policy either not found, or has already been published' })
    }
  })

  // GEOGRAPHIES
  // GEOGRAPHY GETS

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

  // GEOGRAPHY POSTS
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

  // GEOGRAPHY PUTS
  app.put(pathsFor('/admin/geographies/:geography_id'), async (req, res) => {
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

  // GEOGRAPHY DELETE
  app.delete(pathsFor('/admin/geographies/:geography_id'), async (req, res) => {
    const { geography_id } = req.params
    try {
      await db.deleteGeography(geography_id)
      res.status(200).send({ result: `Successfully deleted geography of id ${geography_id}` })
    } catch (err) {
      log.error('failed to delete geography', err.stack)
      res.status(404).send({ result: 'geography either not found or already published' })
    }
  })

  // METADATA ENDPOINTS
  // GEOGRAPHY METADATA

  /*
GET /geographies/meta

Get a list of geography metadata.  Search parameters TBD.
*/

  app.get(pathsFor('/geographies/meta/:geography_id'), async (req, res) => {
    /*
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
    */
  })
  /*

POST /geographies/meta/{id}

Create
*/

  app.post(pathsFor('/admin/geographies/meta/:geography_id'), async (req, res) => {
    const geography_metadata = req.body

    try {
      await db.writeGeographyMetadata(geography_metadata)
      res.status(200).send({ result: `successfully wrote policy of id ${geography_metadata.geography_id}` })
    } catch (err) {
      log.error('failed to write geography metadata', err.stack)
      res.status(404).send({ result: 'not found' })
    }
  })
  /*

PUT /geographies/meta/{id}

Update
*/

  return app
}

export { api }
