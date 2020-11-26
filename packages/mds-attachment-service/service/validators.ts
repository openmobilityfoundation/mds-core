import Joi from 'joi'
import { schemaValidator } from '@mds-core/mds-schema-validators'
import { AttachmentDomainModel } from '../@types'

export const {
  validate: validateAttachmentDomainModel,
  isValid: isValidAttachmentDomainModel
} = schemaValidator<AttachmentDomainModel>(
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
