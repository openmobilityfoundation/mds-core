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


  return app
}

export { api }
