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
// import { isProviderId, providerName } from '@mds-core/mds-providers'
import { Policy, UUID } from '@mds-core/mds-types'
import db from '@mds-core/mds-db'
import { now, pathsFor, NotFoundError, isUUID } from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'
import { PolicyApiRequest, PolicyApiResponse, GetPoliciesResponse, GetPolicyResponse } from './types'
import { PolicyApiVersionMiddleware } from './middleware'

function api(app: express.Express): express.Express {
  app.use(PolicyApiVersionMiddleware)
  /**
   * Policy-specific middleware to extract provider_id into locals, do some logging, etc.
   */
  app.use(async (req: PolicyApiRequest, res: PolicyApiResponse, next: express.NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*')
    try {
      // verify presence of provider_id
      if (!(req.path.includes('/health') || req.path === '/' || req.path === '/schema/policy')) {
        if (res.locals.claims) {
          /* TEMPORARILY REMOVING SO NON-PROVIDERS CAN ACCESS POLICY API */
          // const { provider_id } = res.locals.claims
          // /* istanbul ignore next */
          // if (!provider_id) {
          //   logger.warn('Missing provider_id in', req.originalUrl)
          //   return res.status(400).send({ result: 'missing provider_id' })
          // }
          // /* istanbul ignore next */
          // if (!isUUID(provider_id)) {
          //   logger.warn(req.originalUrl, 'bogus provider_id', provider_id)
          //   return res.status(400).send({ result: `invalid provider_id ${provider_id} is not a UUID` })
          // }
          // if (!isProviderId(provider_id)) {
          //   return res.status(400).send({
          //     result: `invalid provider_id ${provider_id} is not a known provider`
          //   })
          // }
          // logger.info(providerName(provider_id), req.method, req.originalUrl)
        } else {
          return res.status(401).send({ error: 'Unauthorized' })
        }
      }
    } catch (err) {
      /* istanbul ignore next */
      logger.error(req.originalUrl, 'request validation fail:', err.stack)
    }
    next()
  })

  app.get(pathsFor('/policies'), async (req: PolicyApiRequest, res: GetPoliciesResponse) => {
    // TODO extract start/end applicability
    // TODO filter by start/end applicability
    const { start_date = now(), end_date = now() } = req.query
    logger.info('read /policies', req.query, start_date, end_date)
    if (start_date > end_date) {
      res.status(400).send({ error: 'start_date after end_date' })
      return
    }
    try {
      const policies = await db.readPolicies({ get_published: true, get_unpublished: null })
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
      res.status(200).send({ version: res.locals.version, policies: active })
    } catch (err) {
      res.status(404).send({
        error: 'not found'
      })
    }
  })

  app.get(pathsFor('/policies/:policy_id'), async (req: PolicyApiRequest, res: GetPolicyResponse) => {
    logger.info('read policy', JSON.stringify(req.params))
    const { policy_id } = req.params
    if (!isUUID(policy_id)) {
      res.status(400).send({ error: 'bad_param' })
      return
    }
    try {
      const policy = await db.readPolicy(policy_id)
      res.status(200).send({ version: res.locals.version, policy })
    } catch (err) {
      logger.error('failed to read one policy', err)
      if (err instanceof NotFoundError) {
        res.status(404).send({ error: 'not found' })
      } else {
        res.status(500).send({ error: 'something else went wrong' })
      }
    }
  })

  return app
}

export { api }
