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

import Joi from 'joi'
import { schemaValidator } from '@mds-core/mds-schema-validators'
import { PolicyDomainModel, PolicyMetadataDomainModel } from '../@types'

export const { validate: validatePolicyDomainModel, isValid: isValidPolicyDomainModel } =
  schemaValidator<PolicyDomainModel>(
    Joi.object<PolicyDomainModel>()
      .keys({
        policy_id: Joi.string().uuid().required(),
        name: Joi.string().required(),
        description: Joi.string().required(),
        provider_ids: Joi.array().items(Joi.string().uuid()).allow(null),
        start_date: Joi.number().integer().required(),
        end_date: Joi.number().integer().allow(null),
        prev_policies: Joi.array().items(Joi.string().uuid()).allow(null),
        rules: Joi.array().required(),
        publish_date: Joi.number().integer().allow(null)
      })
      .unknown(false)
  )

export const { validate: validatePolicyMetadataDomainModel, isValid: isValidPolicyMetadataDomainModel } =
  schemaValidator<PolicyMetadataDomainModel>(
    Joi.object<PolicyMetadataDomainModel>()
      .keys({
        policy_id: Joi.string().uuid().required(),
        policy_metadata: Joi.any()
      })
      .unknown(false)
  )
