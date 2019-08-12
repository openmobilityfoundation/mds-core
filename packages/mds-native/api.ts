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
  ValidationError,
  ServerError,
  AuthorizationError,
  isValidDeviceId,
  NotFoundError,
  isValidProviderId,
  isValidTimestamp,
  isValidNumber
} from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'
import db from '@mds-core/mds-db'
import { UUID, Timestamp } from 'packages/mds-types'

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
  app.use(async (req: NativeApiRequest, res: NativeApiResponse, next: express.NextFunction) => {
    if (!(req.path.includes('/health') || req.path === '/')) {
      try {
        if (res.locals.claims) {
          // no test access without auth
          const { scope = '' } = res.locals.claims
          if (req.path.includes('/test/') && !scope.includes('test:all')) {
            return res.status(403).send({ error: new AuthorizationError('invalid_scope', { scope }) })
          }
        } else {
          return res.status(401).send({ error: new AuthorizationError('missing_claims') })
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
    logger.info(req.method, req.originalUrl)
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

  type NativeApiGetEventsCursor = Partial<{
    provider_id: UUID
    device_id: UUID
    start_time: Timestamp
    end_time: Timestamp
    last_id: number
  }>

  const getRequestParameters = (
    req: NativeApiGetEventsRequest
  ): { cursor: NativeApiGetEventsCursor; limit: number } => {
    const {
      params: { cursor },
      query: { limit = 1000, ...filters }
    } = req
    isValidNumber(limit, { required: false, min: 1, max: 1000, property: 'limit' })
    if (cursor) {
      if (Object.keys(filters).length > 0) {
        throw new ValidationError('unexpected_filters', { cursor, filters })
      }
      try {
        return {
          cursor: JSON.parse(Buffer.from(cursor, 'base64').toString('ascii')),
          limit: Number(limit)
        }
      } catch (err) /* istanbul ignore next */ {
        throw new ValidationError('invalid_cursor', { cursor })
      }
    } else {
      const { provider_id, device_id, start_time, end_time } = filters
      isValidProviderId(provider_id, { required: false })
      isValidDeviceId(device_id, { required: false })
      isValidTimestamp(start_time, { required: false })
      isValidTimestamp(end_time, { required: false })
      return {
        cursor: {
          provider_id,
          device_id,
          start_time: start_time ? Number(start_time) : undefined,
          end_time: end_time ? Number(end_time) : undefined
        },
        limit: Number(limit)
      }
    }
  }

  app.get(pathsFor('/events/:cursor?'), async (req: NativeApiGetEventsRequest, res: NativeApiGetEventsReponse) => {
    try {
      const { cursor, limit } = getRequestParameters(req)
      const events = await db.readEventsWithTelemetry({ ...cursor, limit })
      return res.status(200).send({
        version: NATIVE_API_VERSION,
        cursor: Buffer.from(
          JSON.stringify({
            ...cursor,
            last_id: events.length === 0 ? cursor.last_id : events[events.length - 1].id
          })
        ).toString('base64'),
        events: events.map(({ service_area_id, ...event }) => event)
      })
    } catch (err) /* istanbul ignore next */ {
      if (err instanceof ValidationError) {
        await logger.warn(req.method, req.originalUrl, err)
        return res.status(400).send({ error: err })
      }
      // 500 Internal Server Error
      await logger.error(req.method, req.originalUrl, err)
      return res.status(500).send({ error: new ServerError(err) })
    }
  })

  app.get(pathsFor('/devices/:device_id'), async (req: NativeApiGetDeviceRequest, res: NativeApiGetDeviceResponse) => {
    const { device_id } = req.params
    try {
      if (isValidDeviceId(device_id)) {
        const device = await db.readDevice(device_id)
        return res.status(200).send({ version: NATIVE_API_VERSION, device })
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
      await logger.error(req.method, req.originalUrl, err)
      return res.status(500).send({ error: new ServerError(err) })
    }
  })

  return app
}

export { api }
