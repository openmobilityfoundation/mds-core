/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import express, { NextFunction } from 'express'
// import { isProviderId, providerName } from '@mds-core/mds-providers'
import { Policy, UUID } from '@mds-core/mds-types'
import db from '@mds-core/mds-db'
import { now, pathPrefix, NotFoundError, isUUID, BadParamsError, ServerError } from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'
import { parseRequest } from '@mds-core/mds-api-helpers'
import { ApiRequest, ApiResponse } from '@mds-core/mds-api-server'
import { policySchemaJson } from '@mds-core/mds-schema-validators'
import {
  PolicyApiRequest,
  PolicyApiResponse,
  PolicyApiGetPoliciesResponse,
  PolicyApiGetPolicyResponse,
  PolicyApiGetPoliciesRequest,
  PolicyApiGetPolicyRequest
} from './types'
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
      if (!(req.path.includes('/health') || req.path.includes('/schema/policy'))) {
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
    } catch (error) {
      /* istanbul ignore next */
      logger.error('request validation fail', { error, originalUrl: req.originalUrl })
    }
    next()
  })

  app.get(
    pathPrefix('/policies'),
    async (req: PolicyApiGetPoliciesRequest, res: PolicyApiGetPoliciesResponse, next: express.NextFunction) => {
      const { start_date = now(), end_date = now() } = req.query
      const { scopes } = res.locals

      try {
        /*
          If the client is scoped to read unpublished policies,
          they are permitted to query for both published and unpublished policies.
          Otherwise, they can only read published.
        */
        const { get_published = null, get_unpublished = null } = scopes.includes('policies:read')
          ? parseRequest(req).single({ parser: JSON.parse }).query('get_published', 'get_unpublished')
          : { get_published: true }

        if (start_date > end_date) {
          throw new BadParamsError(`start_date ${start_date} > end_date ${end_date}`)
        }
        const policies = await db.readPolicies({ get_published, get_unpublished })
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

        if (active.length === 0) {
          throw new NotFoundError('No policies found!')
        }

        res.status(200).send({ version: res.locals.version, data: { policies: active } })
      } catch (error) {
        if (error instanceof NotFoundError) {
          return res.status(404).send({ error })
        }
        if (error instanceof BadParamsError) {
          return res.status(400).send({ error })
        }
        next(new ServerError(error))
      }
    }
  )

  app.get(
    pathPrefix('/policies/:policy_id'),
    async (req: PolicyApiGetPolicyRequest, res: PolicyApiGetPolicyResponse, next: express.NextFunction) => {
      const { policy_id } = req.params
      const { scopes } = res.locals

      try {
        if (!isUUID(policy_id)) {
          throw new BadParamsError(`policy_id ${policy_id} is not a valid UUID`)
        }

        /*
          If the client is scoped to read unpublished policies,
          they are permitted to query for both published and unpublished policies.
          Otherwise, they can only read published.
        */
        const { get_published = null, get_unpublished = null } = scopes.includes('policies:read')
          ? parseRequest(req).single({ parser: JSON.parse }).query('get_published', 'get_unpublished')
          : { get_published: true }

        const policies = await db.readPolicies({ policy_id, get_published, get_unpublished })

        if (policies.length === 0) {
          throw new NotFoundError(`policy_id ${policy_id} not found`)
        }

        const [policy] = policies

        res.status(200).send({ version: res.locals.version, data: { policy } })
      } catch (error) {
        if (error instanceof BadParamsError) {
          return res.status(400).send({ error })
        }
        if (error instanceof NotFoundError) {
          return res.status(404).send({ error })
        }
        return next(new ServerError(error))
      }
    }
  )

  app.get(pathPrefix('/schema/policy'), (req, res) => {
    res.status(200).send(policySchemaJson)
  })

  /* eslint-reason global error handling middleware */
  /* istanbul ignore next */
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  app.use(async (error: Error, req: ApiRequest, res: ApiResponse, next: NextFunction) => {
    const { method, originalUrl } = req
    logger.error('Fatal MDS Policy Error (global error handling middleware)', {
      method,
      originalUrl,
      error
    })
    return res.status(500).send({ error })
  })

  return app
}

export { api }
