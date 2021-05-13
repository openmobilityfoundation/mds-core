/**
 * Copyright 2020 City of Los Angeles
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

import { ApiVersionMiddleware } from '@mds-core/mds-api-server'
import { SchemaValidator } from '@mds-core/mds-schema-validators'
import {
  TRANSACTION_API_SUPPORTED_VERSIONS,
  TRANSACTION_API_DEFAULT_VERSION,
  TRANSACTION_API_SUPPORTED_VERSION
} from '../@types'

export const TransactionApiVersionMiddleware = ApiVersionMiddleware(
  'application/vnd.mds.transaction+json',
  TRANSACTION_API_SUPPORTED_VERSIONS
).withDefaultVersion(TRANSACTION_API_DEFAULT_VERSION)

export const { $schema: TransactionApiVersionSchema } = SchemaValidator<{ version: TRANSACTION_API_SUPPORTED_VERSION }>(
  {
    $id: 'TransactionApiVersion',
    description: 'API version in SemVer',
    type: 'string',
    enum: [...TRANSACTION_API_SUPPORTED_VERSIONS],
    example: TRANSACTION_API_DEFAULT_VERSION
  },
  { keywords: ['example'] }
)
