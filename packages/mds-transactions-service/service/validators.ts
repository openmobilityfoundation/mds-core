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
import { TransactionDomainModel, TransactionOperationDomainModel, TransactionStatusDomainModel } from '../@types'

export const {
  validate: validateTransactionDomainModel,
  isValid: isValidTransactionDomainModel
} = schemaValidator<TransactionDomainModel>(
  Joi.object<TransactionDomainModel>().keys({
    transaction_id: Joi.string().uuid().required(),
    provider_id: Joi.string().uuid().required(),
    device_id: Joi.string().uuid().optional(),
    timestamp: Joi.number().integer().required(),
    fee_type: Joi.string().required(),
    amount: Joi.number().integer().required(),
    receipt: Joi.object().required() // no other validation, for now
  })
)

export const {
  validate: validateTransactionOperationDomainModel,
  isValid: isValidTransactionOperationDomainModel
} = schemaValidator<TransactionOperationDomainModel>(
  Joi.object<TransactionOperationDomainModel>().keys({
    transaction_id: Joi.string().uuid().required(),
    operation_id: Joi.string().uuid().required(),
    timestamp: Joi.number().integer().required(),
    operation_type: Joi.string().required(),
    author: Joi.string().required()
  })
)

export const {
  validate: validateTransactionStatusDomainModel,
  isValid: isValidTransactionStatusDomainModel
} = schemaValidator<TransactionStatusDomainModel>(
  Joi.object<TransactionStatusDomainModel>().keys({
    transaction_id: Joi.string().uuid().required(),
    status_id: Joi.string().uuid().required(),
    timestamp: Joi.number().integer().required(),
    status_type: Joi.string().required(),
    author: Joi.string().required()
  })
)
