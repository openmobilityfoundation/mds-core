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
import { AUDIT_EVENT_TYPES, VEHICLE_EVENTS } from '@mds-core/mds-types'
import Joi from 'joi'
import { AuditAttachmentDomainModel, AuditDomainModel, AuditEventDomainModel } from '../@types'

export const { validate: validateAuditDomainModel, isValid: isValidAuditDomainModel } =
  schemaValidator<AuditDomainModel>(
    Joi.object<AuditDomainModel>()
      .keys({
        audit_trip_id: Joi.string().uuid().required(),
        audit_device_id: Joi.string().uuid().required(),
        audit_subject_id: Joi.string().required(),
        provider_id: Joi.string().uuid().required(),
        provider_name: Joi.string().required(),
        provider_vehicle_id: Joi.string().required(),
        provider_device_id: Joi.string().uuid().allow(null)
      })
      .unknown(false)
  )

export const { validate: validateAuditEventDomainModel, isValid: isValidAuditEventDomainModel } =
  schemaValidator<AuditEventDomainModel>(
    Joi.object<AuditEventDomainModel>()
      .keys({
        audit_trip_id: Joi.string().uuid().required(),
        timestamp: Joi.number().integer().required(),
        audit_event_id: Joi.string().uuid().required(),
        audit_event_type: Joi.string().valid(...Object.keys(AUDIT_EVENT_TYPES).concat(Object.keys(VEHICLE_EVENTS))),
        audit_issue_code: Joi.string().allow(null),
        audit_subject_id: Joi.string().required(),
        note: Joi.string().allow(null),
        telemetry: Joi.object()
          .keys({
            charge: Joi.number().allow(null),
            gps: Joi.object()
              .keys({
                lat: Joi.number().required(),
                lng: Joi.number().required(),
                speed: Joi.number().allow(null),
                heading: Joi.number().allow(null),
                accuracy: Joi.number().allow(null),
                altitude: Joi.number().allow(null)
              })
              .required()
          })
          .allow(null)
      })
      .unknown(false)
  )

export const { validate: validateAuditAttachmentDomainModel, isValid: isValidAuditAttachmentDomainModel } =
  schemaValidator<AuditAttachmentDomainModel>(
    Joi.object<AuditAttachmentDomainModel>()
      .keys({
        audit_trip_id: Joi.string().uuid().required(),
        attachment_id: Joi.string().uuid().required()
      })
      .unknown(false)
  )
