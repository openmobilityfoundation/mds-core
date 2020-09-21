/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { providers } from '@mds-core/mds-providers' // map of uuids -> obb
import {
  Geography,
  Policy,
  VehicleEvent,
  VEHICLE_TYPES,
  DAYS_OF_WEEK,
  AUDIT_EVENT_TYPES,
  VEHICLE_EVENTS,
  AUDIT_EVENT_TYPE,
  VEHICLE_EVENT,
  RULE_TYPES,
  UUID,
  Timestamp,
  Telemetry,
  Stop,
  PROPULSION_TYPES,
  VEHICLE_STATUSES,
  Device
} from '@mds-core/mds-types'
import * as Joi from 'joi'
import joiToJson from 'joi-to-json'

import { ValidationError } from '@mds-core/mds-utils'

export { ValidationError }

interface ValidatorOptions {
  property: string
  assert: boolean
  required: boolean
  allowUnknown: boolean
}

// Convert empty string to undefined so required/optional works as expected
export const stringSchema = Joi.string().empty('')

// Don't allow type conversion
export const numberSchema = Joi.number().options({ convert: false })

export const uuidSchema = stringSchema.guid()

export const timestampSchema = numberSchema.min(1420099200000)

export const providerIdSchema = uuidSchema.valid(...Object.keys(providers))

const vehicleIdSchema = stringSchema.max(255)

const telemetrySchema = Joi.object().keys({
  gps: Joi.object()
    .keys({
      lat: numberSchema.min(-90).max(90).required(),
      lng: numberSchema.min(-180).max(180).required(),
      speed: numberSchema.optional(),
      heading: numberSchema.optional(),
      accuracy: numberSchema.optional(),
      hdop: numberSchema.optional(),
      altitude: numberSchema.optional(),
      satellites: numberSchema.optional()
    })
    .required(),
  charge: numberSchema.optional(),
  provider_id: providerIdSchema.optional(),
  device_id: uuidSchema.optional(),
  timestamp: timestampSchema.required(),
  recorded: timestampSchema.optional()
})

const ruleSchema = Joi.object().keys({
  name: Joi.string().required(),
  rule_id: Joi.string().guid().required(),
  rule_type: Joi.string()
    .valid(...Object.values(RULE_TYPES))
    .required(),
  rule_units: Joi.string().valid('seconds', 'minutes', 'hours', 'mph', 'kph'),
  geographies: Joi.array().items(Joi.string().guid()),
  statuses: Joi.object()
    .keys({
      available: Joi.array(),
      reserved: Joi.array(),
      unavailable: Joi.array(),
      removed: Joi.array(),
      inactive: Joi.array(),
      trip: Joi.array(),
      elsewhere: Joi.array()
    })
    .allow(null),
  vehicle_types: Joi.array().items(Joi.string().valid(...Object.values(VEHICLE_TYPES))),
  maximum: Joi.number(),
  minimum: Joi.number(),
  start_time: Joi.string(),
  end_time: Joi.string(),
  days: Joi.array().items(Joi.string().valid(...Object.values(DAYS_OF_WEEK))),
  messages: Joi.object(),
  value_url: Joi.string().uri()
})

export const policySchema = Joi.object().keys({
  name: Joi.string().required(),
  description: Joi.string().required(),
  policy_id: Joi.string().guid().required(),
  start_date: Joi.date().timestamp('javascript').required(),
  end_date: Joi.date().timestamp('javascript').allow(null),
  prev_policies: Joi.array().items(Joi.string().guid()).allow(null),
  provider_ids: Joi.array().items(Joi.string().guid()).allow(null),
  rules: Joi.array().min(1).items(ruleSchema).required()
})

const policiesSchema = Joi.array().items(policySchema)

const featureSchema = Joi.object()
  .keys({
    type: Joi.string().valid('Feature').required(),
    properties: Joi.object().required(),
    geometry: Joi.object().required()
  })
  .unknown(true) // TODO

const featureCollectionSchema = Joi.object()
  .keys({
    type: Joi.string().valid('FeatureCollection').required(),
    features: Joi.array().min(1).items(featureSchema).required()
  })
  .unknown(true) // TODO

export const geographySchema = Joi.object().keys({
  geography_id: Joi.string().guid().required(),
  name: Joi.string().required(),
  geography_json: featureCollectionSchema,
  prev_geographies: Joi.array().items(Joi.string().guid()).allow(null),
  effective_date: timestampSchema,
  description: Joi.string()
})

const geographiesSchema = Joi.array().items(geographySchema)

const eventsSchema = Joi.array().items()

const vehicleEventTypeSchema = stringSchema.valid(...Object.keys(VEHICLE_EVENTS))

const vehicleTypeSchema = stringSchema.valid(...Object.keys(VEHICLE_TYPES))

const propulsionTypeSchema = stringSchema.valid(...Object.keys(PROPULSION_TYPES))

const vehicleStatusSchema = stringSchema.valid(...Object.keys(VEHICLE_STATUSES))

const eventSchema = Joi.object().keys({
  device_id: uuidSchema.required(),
  provider_id: uuidSchema.required(),
  timestamp: timestampSchema.required(),
  event_type: vehicleEventTypeSchema.required(),
  telemetry_timestamp: timestampSchema.optional(),
  telemetry: telemetrySchema.required(),
  service_area_id: uuidSchema.allow(null).optional(),
  recorded: timestampSchema.optional()
})

const tripEventSchema = eventSchema.keys({
  trip_id: uuidSchema.required()
})

const serviceEndEventSchema = eventSchema.keys({
  event_type_reason: stringSchema.valid('low_battery', 'maintenance', 'compliance', 'off_hours').required()
})

const providerPickUpEventSchema = eventSchema.keys({
  event_type_reason: stringSchema.valid('rebalance', 'maintenance', 'charge', 'compliance').required()
})

const deregisterEventSchema = eventSchema.keys({
  event_type_reason: stringSchema.valid('missing', 'decomissioned').required()
})

const auditEventTypeSchema = (accept?: AUDIT_EVENT_TYPE[]): Joi.StringSchema =>
  stringSchema.valid(...(accept || Object.keys(AUDIT_EVENT_TYPES)))

const auditIssueCodeSchema = stringSchema.max(31)

const auditNoteSchema = stringSchema.max(255)

const vehicleTypesCountMapSchema = Joi.object().keys({
  scooter: Joi.number(),
  bicycle: Joi.number(),
  car: Joi.number(),
  moped: Joi.number()
})

const stopSchema = Joi.object().keys({
  stop_id: uuidSchema.required(),
  stop_name: stringSchema.required(),
  short_name: stringSchema.optional(),
  platform_code: stringSchema.optional(),
  geography_id: uuidSchema.optional(),
  lat: numberSchema.min(-90).max(90).required(),
  lng: numberSchema.min(-180).max(180).required(),
  zone_id: uuidSchema.optional(),
  address: stringSchema.optional(),
  post_code: stringSchema.optional(),
  rental_methods: stringSchema.optional(),
  capacity: vehicleTypesCountMapSchema.required(),
  location_type: stringSchema.optional(),
  timezone: stringSchema.optional(),
  cross_street: stringSchema.optional(),
  num_vehicles_available: vehicleTypesCountMapSchema.required(),
  num_vehicles_disabled: vehicleTypesCountMapSchema.optional(),
  num_spots_available: vehicleTypesCountMapSchema.required(),
  num_spots_disabled: vehicleTypesCountMapSchema.optional(),
  wheelchair_boarding: Joi.bool(),
  reservation_cost: vehicleTypesCountMapSchema.optional()
})

const deviceSchema = Joi.object().keys({
  device_id: uuidSchema.required(),
  provider_id: uuidSchema.required(),
  vehicle_id: stringSchema.required(),
  type: vehicleTypeSchema.required(),
  propulsion: Joi.array().items(propulsionTypeSchema).required(),
  year: numberSchema.optional(),
  mfgr: stringSchema.optional(),
  model: stringSchema.optional(),
  recorded: timestampSchema.optional(),
  status: vehicleStatusSchema
})

const Format = (property: string, error: Joi.ValidationError): string => {
  const [{ message, path }] = error.details
  const [, ...details] = message.split(' ')
  return `${[property, ...path].join('.')} ${details.join(' ')}`
}

export const ValidateSchema = <T = unknown>(
  value: unknown,
  schema: Joi.Schema,
  options: Partial<ValidatorOptions> = {}
): value is T => {
  const { assert = true, required = true, property = 'value', allowUnknown = false } = options
  const { error } = schema.validate(value, { presence: required ? 'required' : 'optional', allowUnknown })
  if (error && assert) {
    throw new ValidationError(`invalid_${property}`.toLowerCase(), {
      [property]: value,
      details: Format(property, error)
    })
  }
  return !error
}

interface NumberValidatorOptions extends ValidatorOptions {
  min: number
  max: number
}

export const isValidNumber = (value: unknown, options: Partial<NumberValidatorOptions> = {}): value is number =>
  ValidateSchema(
    value,
    numberSchema
      .min(options.min === undefined ? Number.MIN_SAFE_INTEGER : options.min)
      .max(options.max === undefined ? Number.MAX_SAFE_INTEGER : options.max),
    options
  )

export const isValidAuditTripId = (
  audit_trip_id: unknown,
  options: Partial<ValidatorOptions> = {}
): audit_trip_id is UUID => ValidateSchema(audit_trip_id, uuidSchema, { property: 'audit_trip_id', ...options })

interface AuditEventValidatorOptions extends ValidatorOptions {
  accept: AUDIT_EVENT_TYPE[]
}

export const isValidStop = (value: unknown): value is Stop => {
  const { error } = stopSchema.validate(value)
  if (error) {
    throw new ValidationError('invalid_stop', {
      value,
      details: Format('stop', error)
    })
  }
  return true
}

export const isValidDeviceId = (value: unknown, options: Partial<ValidatorOptions> = {}): value is UUID =>
  ValidateSchema(value, uuidSchema, { property: 'device_id', ...options })

export const isValidAuditEventType = (
  value: unknown,
  { accept, ...options }: Partial<AuditEventValidatorOptions> = {}
): value is AUDIT_EVENT_TYPE =>
  ValidateSchema(value, auditEventTypeSchema(accept), { property: 'audit_event_type', ...options })

export const isValidTimestamp = (value: unknown, options: Partial<ValidatorOptions> = {}): value is Timestamp =>
  ValidateSchema(value, timestampSchema, { property: 'timestamp', ...options })

export const isValidProviderId = (value: unknown, options: Partial<ValidatorOptions> = {}): value is UUID =>
  ValidateSchema(value, providerIdSchema, { property: 'provider_id', ...options })

export const isValidProviderVehicleId = (value: unknown, options: Partial<ValidatorOptions> = {}): value is string =>
  ValidateSchema(value, vehicleIdSchema, { property: 'provider_vehicle_id', ...options })

export const isValidAuditEventId = (value: unknown, options: Partial<ValidatorOptions> = {}): value is UUID =>
  ValidateSchema(value, uuidSchema, { property: 'audit_event_id', ...options })

export const isValidAuditDeviceId = (value: unknown, options: Partial<ValidatorOptions> = {}): value is UUID =>
  ValidateSchema(value, uuidSchema, { property: 'audit_device_id', ...options })

export const isValidTelemetry = (value: unknown, options: Partial<ValidatorOptions> = {}): value is Telemetry =>
  ValidateSchema(value, telemetrySchema, { property: 'telemetry', ...options })

export const isValidDevice = (value: unknown, options: Partial<ValidatorOptions> = {}): value is Device =>
  ValidateSchema(value, deviceSchema, options)

export const isValidEvent = (value: unknown, options: Partial<ValidatorOptions> = {}): value is VehicleEvent =>
  ValidateSchema(value, eventSchema, options)

export const isValidVehicleEventType = (
  value: unknown,
  options: Partial<ValidatorOptions> = {}
): value is VEHICLE_EVENT =>
  ValidateSchema(value, vehicleEventTypeSchema, { property: 'vehicle_event_type', ...options })

export const isValidAuditIssueCode = (value: unknown, options: Partial<ValidatorOptions> = {}): value is string =>
  ValidateSchema(value, auditIssueCodeSchema, { property: 'audit_issue_code', ...options })

export const isValidAuditNote = (value: unknown, options: Partial<ValidatorOptions> = {}): value is string =>
  ValidateSchema(value, auditNoteSchema, { property: 'note', ...options })

export const HasPropertyAssertion = <T>(obj: unknown, ...props: (keyof T)[]): obj is T =>
  typeof obj === 'object' && obj !== null && props.every(prop => prop in obj)

export function validatePolicies(policies: unknown): policies is Policy[] {
  const { error } = policiesSchema.validate(policies)
  if (error) {
    throw new ValidationError('invalid_policies', {
      policies,
      details: Format('policies', error)
    })
  }
  return true
}

export function validateGeographies(geographies: unknown): geographies is Geography[] {
  const { error } = geographiesSchema.validate(geographies)
  if (error) {
    throw new ValidationError('invalid_geographies', {
      geographies,
      details: Format('geographies', error)
    })
  }
  return true
}

export function validateEvents(events: unknown): events is VehicleEvent[] {
  const { error } = eventsSchema.validate(events)
  if (error) {
    throw new ValidationError('invalid events', {
      events,
      details: Format('events', error)
    })
  }
  return true
}

export function policyValidationDetails(policy: Policy): Joi.ValidationErrorItem[] | null {
  const { error } = policySchema.validate(policy, { allowUnknown: false })
  if (error) {
    return error.details
  }
  return null
}

export function geographyValidationDetails(geography: Geography): Joi.ValidationErrorItem[] | null {
  const { error } = geographySchema.validate(geography, { allowUnknown: false })
  if (error) {
    return error.details
  }
  return null
}

export function rawValidatePolicy(policy: Policy): Joi.ValidationResult {
  return policySchema.validate(policy)
}

const validateTripEvent = (event: VehicleEvent) => ValidateSchema(event, tripEventSchema, {})

const validateProviderPickUpEvent = (event: VehicleEvent) => ValidateSchema(event, providerPickUpEventSchema, {})

const validateServiceEndEvent = (event: VehicleEvent) => ValidateSchema(event, serviceEndEventSchema, {})

const validateDeregisterEvent = (event: VehicleEvent) => ValidateSchema(event, deregisterEventSchema, {})

export const validateEvent = (event: unknown) => {
  if (isValidEvent(event, { allowUnknown: true })) {
    const { event_type } = event

    const TRIP_EVENTS: string[] = [
      VEHICLE_EVENTS.trip_start,
      VEHICLE_EVENTS.trip_end,
      VEHICLE_EVENTS.trip_enter,
      VEHICLE_EVENTS.trip_leave
    ]

    if (TRIP_EVENTS.includes(event_type)) {
      return validateTripEvent(event)
    }
    if (event_type === VEHICLE_EVENTS.provider_pick_up) {
      return validateProviderPickUpEvent(event)
    }
    if (event_type === VEHICLE_EVENTS.service_end) {
      return validateServiceEndEvent(event)
    }
    if (event_type === VEHICLE_EVENTS.deregister) {
      return validateDeregisterEvent(event)
    }

    return ValidateSchema(event, eventSchema, {})
  }
}

export const policySchemaJson = joiToJson(policySchema)

export const SchemaBuilder = Joi
