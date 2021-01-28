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

import httpContext from 'express-http-context'
import express from 'express'
import log from '@mds-core/mds-logger'
import { ApiRequest, ApiResponse } from '../@types'

/**
 * Middleware that extracts the X-Request-Id header set by the gateway,
 * and includes it in contextual logs for a given request.
 */
const RequestIdMiddleware = (req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
  const xRequestId = req.get('x-request-id')
  if (xRequestId) {
    httpContext.set('x-request-id', xRequestId)
  } else {
    log.warn('X-Request-Id is not set! If you expect it, please check your ingress gateway configuration.')
  }
  return next()
}

export const HttpContextMiddleware = () => {
  return [httpContext.middleware, RequestIdMiddleware]
}
