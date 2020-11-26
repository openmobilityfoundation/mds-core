import Joi from 'joi'
import { schemaValidator } from '@mds-core/mds-schema-validators'
import { AUDIT_EVENT_TYPES, VEHICLE_EVENTS } from '@mds-core/mds-types'
import { AuditAttachmentDomainModel, AuditDomainModel, AuditEventDomainModel } from '../@types'

export const {
  validate: validateAuditDomainModel,
  isValid: isValidAuditDomainModel
} = schemaValidator<AuditDomainModel>(
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

export const {
  validate: validateAuditEventDomainModel,
  isValid: isValidAuditEventDomainModel
} = schemaValidator<AuditEventDomainModel>(
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

export const {
  validate: validateAuditAttachmentDomainModel,
  isValid: isValidAuditAttachmentDomainModel
} = schemaValidator<AuditAttachmentDomainModel>(
  Joi.object<AuditAttachmentDomainModel>()
    .keys({
      audit_trip_id: Joi.string().uuid().required(),
      attachment_id: Joi.string().uuid().required()
    })
    .unknown(false)
)
