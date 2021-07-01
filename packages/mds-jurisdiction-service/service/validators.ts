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

import {
  SchemaBuilder,
  stringSchema,
  timestampSchema,
  uuidSchema,
  ValidateSchema,
  ValidationError
} from '@mds-core/mds-schema-validators'
import { CreateJurisdictionDomainModel } from '../@types'

const createJurisdictionDomainModelSchema = SchemaBuilder.object().keys({
  jurisdiction_id: uuidSchema.optional(),
  agency_key: stringSchema,
  agency_name: stringSchema,
  geography_id: uuidSchema,
  timestamp: timestampSchema.optional()
})

export const ValidateJurisdictionForCreate = (
  jurisdiction: CreateJurisdictionDomainModel
): CreateJurisdictionDomainModel => {
  try {
    ValidateSchema<CreateJurisdictionDomainModel>(jurisdiction, createJurisdictionDomainModelSchema)
    return jurisdiction
  } catch (error) {
    throw new ValidationError('Invalid Jurisdiction', { jurisdiction, error })
  }
}
