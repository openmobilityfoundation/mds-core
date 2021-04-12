// **************************
// 0.4.1 Validators, eventually to be deprecated
// **************************
import Joi from 'joi'

import { VehicleEvent_v0_4_1, VEHICLE_EVENTS_v0_4_1 } from '@mds-core/mds-types/transformers/@types'
import {
  ValidatorOptions,
  ValidateSchema,
  uuidSchema,
  timestampSchema,
  telemetrySchema,
  stringSchema
} from '../validators'

const vehicleEventTypeSchema_v0_4_1 = stringSchema.valid(...VEHICLE_EVENTS_v0_4_1)

const eventSchema_v0_4_1 = Joi.object().keys({
  device_id: uuidSchema.required(),
  provider_id: uuidSchema.required(),
  timestamp: timestampSchema.required(),
  event_type: vehicleEventTypeSchema_v0_4_1.required(),
  telemetry_timestamp: timestampSchema.optional(),
  telemetry: telemetrySchema.required(),
  service_area_id: uuidSchema.allow(null).optional(),
  recorded: timestampSchema.optional()
})
export const isValidEvent_v0_4_1 = (
  value: unknown,
  options: Partial<ValidatorOptions> = {}
): value is VehicleEvent_v0_4_1 => ValidateSchema(value, eventSchema_v0_4_1, options)

const tripEventSchema_v0_4_1 = eventSchema_v0_4_1.keys({
  trip_id: uuidSchema.required()
})

const validateTripEvent_v0_4_1 = (event: VehicleEvent_v0_4_1) => ValidateSchema(event, tripEventSchema_v0_4_1, {})

const serviceEndEventSchema_v0_4_1 = eventSchema_v0_4_1.keys({
  event_type_reason: stringSchema.valid('low_battery', 'maintenance', 'compliance', 'off_hours').required()
})

const providerPickUpEventSchema_v0_4_1 = eventSchema_v0_4_1.keys({
  event_type_reason: stringSchema.valid('rebalance', 'maintenance', 'charge', 'compliance').required()
})

const deregisterEventSchema_v0_4_1 = eventSchema_v0_4_1.keys({
  event_type_reason: stringSchema.valid('missing', 'decommissioned').required()
})

const validateProviderPickUpEvent_v0_4_1 = (event: VehicleEvent_v0_4_1) =>
  ValidateSchema(event, providerPickUpEventSchema_v0_4_1, {})

const validateServiceEndEvent_v0_4_1 = (event: VehicleEvent_v0_4_1) =>
  ValidateSchema(event, serviceEndEventSchema_v0_4_1, {})

const validateDeregisterEvent_v0_4_1 = (event: VehicleEvent_v0_4_1) =>
  ValidateSchema(event, deregisterEventSchema_v0_4_1, {})

export const validateEvent_v0_4_1 = (event: unknown) => {
  if (isValidEvent_v0_4_1(event, { allowUnknown: true })) {
    const { event_type } = event

    const TRIP_EVENTS: string[] = ['trip_start', 'trip_end', 'trip_enter', 'trip_leave']

    if (TRIP_EVENTS.includes(event_type)) {
      return validateTripEvent_v0_4_1(event)
    }
    if (event_type === 'provider_pick_up') {
      return validateProviderPickUpEvent_v0_4_1(event)
    }
    if (event_type === 'service_end') {
      return validateServiceEndEvent_v0_4_1(event)
    }
    if (event_type === 'deregister') {
      return validateDeregisterEvent_v0_4_1(event)
    }
    return ValidateSchema(event, eventSchema_v0_4_1, {})
  }
}
