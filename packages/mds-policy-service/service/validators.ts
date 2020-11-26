import Joi from 'joi'
import { schemaValidator } from '@mds-core/mds-schema-validators'
import { PolicyDomainModel, PolicyMetadataDomainModel } from '../@types'

export const {
  validate: validatePolicyDomainModel,
  isValid: isValidPolicyDomainModel
} = schemaValidator<PolicyDomainModel>(
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

export const {
  validate: validatePolicyMetadataDomainModel,
  isValid: isValidPolicyMetadataDomainModel
} = schemaValidator<PolicyMetadataDomainModel>(
  Joi.object<PolicyMetadataDomainModel>()
    .keys({
      policy_id: Joi.string().uuid().required(),
      policy_metadata: Joi.any()
    })
    .unknown(false)
)
