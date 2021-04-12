/**
 * Copyright 2021 City of Los Angeles
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

import type { Express } from 'express'
import { isUUID, pathPrefix } from '@mds-core/mds-utils'
import { checkAccess } from '@mds-core/mds-api-server'
import { CollectorApiVersionMiddleware } from './middleware/collector-api-version'
import { CollectorApiErrorMiddleware } from './middleware/collector-api-error'
import { GetMessageSchemaHandler } from './handlers/get-message-schema'
import { WriteSchemaMessagesHandler } from './handlers/write-schema-messages'

export const api = (app: Express): Express =>
  app
    .use(CollectorApiVersionMiddleware)

    .get(
      pathPrefix('/schema/:schema_id'),
      checkAccess(scopes => scopes.includes('collector:schemas:read')),
      GetMessageSchemaHandler
    )

    .post(
      pathPrefix('/messages/:schema_id'),
      checkAccess((scopes, claims) => scopes.includes('collector:messages:write') && isUUID(claims?.provider_id)),
      WriteSchemaMessagesHandler
    )

    .use(CollectorApiErrorMiddleware)
