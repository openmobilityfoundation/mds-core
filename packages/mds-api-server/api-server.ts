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

import { JurisdictionsClaim, ProviderIdClaim, UserEmailClaim } from '@mds-core/mds-api-authorizer'
import logger from '@mds-core/mds-logger'
import { pathPrefix } from '@mds-core/mds-utils'
import express from 'express'
import HttpStatus from 'http-status-codes'
import { HealthRequestHandler } from './handlers/health'
import { AuthorizationMiddleware, AuthorizationMiddlewareOptions } from './middleware/authorization'
import { CompressionMiddleware, CompressionMiddlewareOptions } from './middleware/compression'
import { CorsMiddleware, CorsMiddlewareOptions } from './middleware/cors'
import { JsonBodyParserMiddleware, JsonBodyParserMiddlewareOptions } from './middleware/json-body-parser'
import { MaintenanceModeMiddleware, MaintenanceModeMiddlewareOptions } from './middleware/maintenance-mode'
import { PrometheusMiddleware, PrometheusMiddlewareOptions } from './middleware/prometheus'
import { RequestLoggingMiddleware, RequestLoggingMiddlewareOptions } from './middleware/request-logging'
import { serverVersion } from './utils'

export interface ApiServerOptions {
  authorization: AuthorizationMiddlewareOptions
  compression: CompressionMiddlewareOptions
  cors: CorsMiddlewareOptions
  jsonBodyParser: JsonBodyParserMiddlewareOptions
  maintenanceMode: MaintenanceModeMiddlewareOptions
  requestLogging: RequestLoggingMiddlewareOptions
  prometheus: PrometheusMiddlewareOptions
}

export const ApiServer = (
  // The linter does not realize that the type variable is used.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  api: (server: express.Express) => express.Express,
  options: Partial<ApiServerOptions> = {},
  app: express.Express = express()
): express.Express => {
  logger.info(`${serverVersion()} starting`)

  // Log the custom authorization namespace/claims
  const claims = [ProviderIdClaim, UserEmailClaim, JurisdictionsClaim]
  claims.forEach(claim => {
    logger.info(`${serverVersion()} using authorization claim ${claim()}`)
  })

  // Disable x-powered-by header
  app.disable('x-powered-by')

  // Middleware
  app.use(
    CompressionMiddleware(options.compression),
    CorsMiddleware(options.cors),
    JsonBodyParserMiddleware(options.jsonBodyParser),
    AuthorizationMiddleware(options.authorization),
    /** Prometheus Middleware
     * Placed after the other middleware so it can label metrics with additional
     * properties added by the other middleware.
     */
    PrometheusMiddleware(options.prometheus),
    /** Request Logging Middleware
     * Placed after Prometheus middleware to avoid excessive logging
     * Placed after the other middleware to avoid causing collisions
     * see express-http-context's README for more information
     */
    ...RequestLoggingMiddleware(
      options.requestLogging ?? { filters: [{ path: /\/health$/, level: HttpStatus.BAD_REQUEST }] }
    )
  )

  // Health Route
  app.get(pathPrefix('/health'), HealthRequestHandler)

  // Everything except /health will return a 503 when in maintenance mode
  app.use(MaintenanceModeMiddleware(options.maintenanceMode))

  return api(app)
}
