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
import { pathsFor } from '@mds-core/mds-utils'
import { checkAccess } from '@mds-core/mds-api-server'
import { NativeApiVersionMiddleware, NativeApiClaimsMiddleware } from './middleware'
import { GetProvidersHandler, GetVehiclesHandler, GetEventsHandler } from './handlers'

export const api = (app: express.Express): express.Express =>
  app
    .use(NativeApiVersionMiddleware)
    .use(NativeApiClaimsMiddleware)
    .get(
      pathsFor('/events/:cursor?'),
      checkAccess(scopes => scopes.includes('events:read')), // TODO: events:read:provider with filtering
      GetEventsHandler
    )
    .get(
      pathsFor('/vehicles/:device_id'),
      checkAccess(scopes => scopes.includes('vehicles:read')), // TODO: vehicles:read:provider with filtering
      GetVehiclesHandler
    )
    .get(
      pathsFor('/providers'),
      checkAccess(scopes => scopes.includes('providers:read')),
      GetProvidersHandler
    )
