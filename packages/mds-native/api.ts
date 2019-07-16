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
import {
  pathsFor,
  isValidProviderId,
  ValidationError,
  ServerError,
  AuthorizationError,
  isValidDeviceId,
  NotFoundError
} from 'mds-utils'
import logger from 'mds-logger'
import db from 'mds-db'
import { NextFunction } from 'connect'
import { providerName } from 'mds-providers'
import { asPagingParams, asJsonApiLinks } from 'mds-api-helpers'
import {
  NativeApiResponse,
  NativeApiRequest,
  NativeApiGetEventsRequest,
  NativeApiGetEventsReponse,
  NativeApiGetDeviceRequest,
  NativeApiGetDeviceResponse
} from './types'

const NATIVE_API_VERSION = '0.0.1'

function api(app: express.Express): express.Express {
  // ///////////////////// begin middleware ///////////////////////
  app.use(async (req: NativeApiRequest, res: NativeApiResponse, next: NextFunction) => {
    if (!(req.path.includes('/health') || req.path === '/')) {
      try {
        if (res.locals.claims) {
          const { provider_id } = res.locals.claims
          if (isValidProviderId(provider_id)) {
            res.locals.provider_id = provider_id
            logger.info(providerName(provider_id), req.method, req.originalUrl)
          }
        } else {
          return res.status(401).send({ error: new AuthorizationError('missing_provider_id') })
        }
      } catch (err) {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          return res.status(400).send({ error: err })
        }
        // 500 Internal Server Error
        await logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
        return res.status(500).send({ error: new ServerError(err) })
      }
    }
    next()
  })
  // ///////////////////// begin middleware ///////////////////////

  // ///////////////////// begin test-only endpoints ///////////////////////

  app.get(pathsFor('/test/initialize'), async (req: NativeApiRequest, res: NativeApiResponse) => {
    try {
      const kind = await db.initialize()
      const result = `Database initialized (${kind})`
      await logger.info(result)
      // 200 OK
      return res.status(200).send({ result })
    } catch (err) /* istanbul ignore next */ {
      // 500 Internal Server Error
      await logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
      return res.status(500).send({ error: new ServerError(err) })
    }
  })

  app.get(pathsFor('/test/shutdown'), async (req: NativeApiRequest, res: NativeApiResponse) => {
    try {
      await db.shutdown()
      const result = 'Database shutdown'
      await logger.info(result)
      // 200 OK
      return res.status(200).send({ result })
    } catch (err) /* istanbul ignore next */ {
      // 500 Internal Server Error
      await logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
      return res.status(500).send({ error: new ServerError(err) })
    }
  })
  // ///////////////////// end test-only endpoints ///////////////////////

  app.get(pathsFor('/events'), async (req: NativeApiGetEventsRequest, res: NativeApiGetEventsReponse) => {
    const { skip, take, start_time, end_time, ...query } = asPagingParams(req.query)
    try {
      const { count, events } = await db.readEventsWithTelemetry({
        ...query,
        skip,
        take,
        start_time: start_time ? Number(start_time) : undefined,
        end_time: end_time ? Number(end_time) : undefined
      })
      return res.status(200).send({
        version: NATIVE_API_VERSION,
        count,
        data: events.map(({ service_area_id, ...event }) => event),
        links: asJsonApiLinks(req, skip, take, count)
      })
    } catch (err) /* istanbul ignore next */ {
      // 500 Internal Server Error
      await logger.error(`fail ${req.method} ${req.originalUrl}`, JSON.stringify(err))
      return res.status(500).send({ error: new ServerError(err) })
    }
  })

  app.get(pathsFor('/devices/:device_id'), async (req: NativeApiGetDeviceRequest, res: NativeApiGetDeviceResponse) => {
    const { device_id } = req.params
    try {
      if (isValidDeviceId(device_id)) {
        const device = await db.readDevice(device_id)
        return res.status(200).send({
          version: NATIVE_API_VERSION,
          count: 1,
          data: [device]
        })
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        // 400 Bad Request
        return res.status(400).send({ error: err })
      }
      if (err instanceof Error && err.message.includes('not found')) {
        // 404 Not Found
        return res.status(404).send({ error: new NotFoundError('device_id_not_found', { device_id }) })
      }
      // 500 Internal Server Error
      await logger.error(`fail ${req.method} ${req.originalUrl}`, JSON.stringify(err))
      return res.status(500).send({ error: new ServerError(err) })
    }
  })

  return app
}

export { api }
