import Joi from 'joi'
import { schemaValidator } from '@mds-core/mds-schema-validators'
import { VEHICLE_TYPES, PROPULSION_TYPES, VEHICLE_EVENTS, VEHICLE_REASONS } from '@mds-core/mds-types'
import { DeviceDomainModel, EventDomainModel, TelemetryDomainModel } from '../@types'

export const { validate: validateDeviceDomainModel, isValid: isValidDeviceDomainModel } = schemaValidator<
  DeviceDomainModel
>(
  Joi.object<DeviceDomainModel>()
    .keys({
      device_id: Joi.string().uuid().required(),
      provider_id: Joi.string().uuid().required(),
      vehicle_id: Joi.string().required(),
      type: Joi.string()
        .valid(...Object.keys(VEHICLE_TYPES))
        .required(),
      propulsion: Joi.string().valid(...Object.keys(PROPULSION_TYPES)),
      year: Joi.number().allow(null),
      mfgr: Joi.string().allow(null),
      model: Joi.string().allow(null)
    })
    .unknown(false)
)

/* Separate so we can re-use in the event domain model validator */
const telemetrySchema = Joi.object<TelemetryDomainModel>()
  .keys({
    device_id: Joi.string().uuid().required(),
    provider_id: Joi.string().uuid().required(),
    timestamp: Joi.number().required(),
    gps: Joi.object<TelemetryDomainModel['gps']>().keys({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
      speed: Joi.number().allow(null),
      heading: Joi.number().allow(null),
      accuracy: Joi.number().allow(null),
      altitude: Joi.number().allow(null)
    }),
    charge: Joi.number().allow(null)
  })
  .unknown(false)

export const { validate: validateTelemetryDomainModel, isValid: isValidTelemetryDomainModel } = schemaValidator<
  DeviceDomainModel
>(telemetrySchema)

export const { validate: validateEventDomainModel, isValid: isValidEventDomainModel } = schemaValidator<
  DeviceDomainModel
>(
  Joi.object<EventDomainModel>()
    .keys({
      device_id: Joi.string().uuid().required(),
      provider_id: Joi.string().uuid().required(),
      timestamp: Joi.number().required(),
      event_type: Joi.string()
        .valid(...Object.keys(VEHICLE_EVENTS))
        .required(),
      event_type_reason: Joi.string()
        .valid(...Object.keys(VEHICLE_REASONS))
        .allow(null),
      telemetry_timestamp: Joi.number().allow(null),
      telemetry: telemetrySchema.allow(null),
      trip_id: Joi.string().uuid().allow(null),
      service_area_id: Joi.string().uuid().allow(null)
    })
    .unknown(false)
)
