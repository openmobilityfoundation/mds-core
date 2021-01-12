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
