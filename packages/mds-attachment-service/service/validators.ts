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

import { schemaValidator } from '@mds-core/mds-schema-validators'
import Joi from 'joi'
import { AttachmentDomainModel } from '../@types'

export const { validate: validateAttachmentDomainModel, isValid: isValidAttachmentDomainModel } =
  schemaValidator<AttachmentDomainModel>(
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
