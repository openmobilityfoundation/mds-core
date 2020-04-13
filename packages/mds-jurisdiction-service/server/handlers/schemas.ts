/*
    Copyright 2019-2020 City of Los Angeles.

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

import { SchemaBuilder, uuidSchema, stringSchema, timestampSchema } from '@mds-core/mds-schema-validators'
import { Timestamp } from '@mds-core/mds-types'

export const jurisdictionSchema = (max: Timestamp = Date.now()) =>
  SchemaBuilder.object().keys({
    jurisdiction_id: uuidSchema,
    agency_key: stringSchema,
    agency_name: stringSchema,
    geography_id: uuidSchema,
    timestamp: timestampSchema.max(max)
  })
