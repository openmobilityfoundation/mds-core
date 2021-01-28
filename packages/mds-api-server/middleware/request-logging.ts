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

import express from 'express'
import morgan from 'morgan'
import logger from '@mds-core/mds-logger'
import { ApiRequest, ApiResponse, ApiResponseLocalsClaims } from '../@types'

export type RequestLoggingMiddlewareOptions = Partial<{}>

export const RequestLoggingMiddleware = (options: RequestLoggingMiddlewareOptions = {}): express.RequestHandler =>
  morgan<ApiRequest, ApiResponse & ApiResponseLocalsClaims>(
    (tokens, req, res) => {
      return [
        ...(res.locals.claims?.provider_id ? [res.locals.claims.provider_id] : []),
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, 'content-length'),
        '-',
        tokens['response-time'](req, res),
        'ms'
      ]
        .filter((token): token is string => token !== undefined)
        .join(' ')
    },
    {
      skip: (req, res) => {
        const { REQUEST_LOGGING_LEVEL = 0 } = process.env
        return res.statusCode < Number(REQUEST_LOGGING_LEVEL)
      },
      // Use logger, but remove extra line feed added by morgan stream option
      stream: { write: msg => logger.info(msg.slice(0, -1)) }
    }
  )
