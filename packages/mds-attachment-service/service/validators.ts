import Joi from 'joi'
import { ValidationError } from '@mds-core/mds-utils'
import { AttachmentDomainModel } from '../@types'

const schemaValidator = <T>(schema: Joi.AnySchema) => ({
  validate: (value: unknown): T => {
    const { error } = schema.validate(value)
    if (error) {
      throw new ValidationError(error.message, value)
    }
    return value as T
  },
  isValid: (value: unknown): value is T => !schema.validate(value).error
})

export const { validate: validateAttachmentDomainModel, isValid: isValidAttachmentDomainModel } = schemaValidator<
  AttachmentDomainModel
>(
  Joi.object<AttachmentDomainModel>()
    .keys({
      attachment_id: Joi.string().uuid().required(),
      attachment_filename: Joi.string().required(),
      base_url: Joi.string().required(),
      mimetype: Joi.string().required(),
      thumbnail_filename: Joi.string().allow(null),
      thumbnail_mimetype: Joi.string().allow(null)
    })
    .unknown(false)
)
