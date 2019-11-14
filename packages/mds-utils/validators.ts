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
  VEHICLE_TYPES,
  DAYS_OF_WEEK,
  AUDIT_EVENT_TYPES,
  VEHICLE_EVENTS,
  AUDIT_EVENT_TYPE,
  VEHICLE_EVENT,
  UUID,
  Timestamp,
  Telemetry
} from '@mds-core/mds-types'
import * as Joi from '@hapi/joi'
import joiToJsonSchema from 'joi-to-json-schema'
import {
  StringifiedTelemetry,
  StringifiedEventWithTelemetry,
  StringifiedCacheReadDeviceResult
} from '@mds-core/mds-cache/types'
import { ValidationError } from './exceptions'

interface ValidatorOptions {
  property: string
  assert: boolean
  required: boolean
}

// Convert empty string to undefined so required/optional works as expected
const stringSchema = Joi.string().empty('')

// Don't allow type conversion
const numberSchema = Joi.number().options({ convert: false })

const uuidSchema = stringSchema.guid()

const timestampSchema = numberSchema.min(1420099200000)

const providerIdSchema = uuidSchema.valid(Object.keys(providers))

const vehicleIdSchema = stringSchema.max(255)

const telemetrySchema = Joi.object().keys({
  gps: Joi.object()
    .keys({
      lat: numberSchema
        .min(-90)
        .max(90)
        .required(),
      lng: numberSchema
        .min(-180)
        .max(180)
        .required(),
      speed: numberSchema.optional(),
      heading: numberSchema.optional(),
      accuracy: numberSchema.optional(),
      altitude: numberSchema.optional()
    })
    .required(),
  charge: numberSchema.optional(),
  provider_id: providerIdSchema.optional(),
  device_id: uuidSchema.optional(),
  timestamp: timestampSchema.required()
})

const ruleSchema = Joi.object().keys({
  name: Joi.string().required(),
  rule_id: Joi.string()
    .guid()
    .required(),
  rule_type: Joi.string()
    .valid(['count', 'time', 'speed', 'user'])
    .required(),
  rule_units: Joi.string().valid(['seconds', 'minutes', 'hours', 'mph', 'kph']),
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
  vehicle_types: Joi.array().items(Joi.string().valid(Object.values(VEHICLE_TYPES))),
  maximum: Joi.number(),
  minimum: Joi.number(),
  start_time: Joi.string(),
  end_time: Joi.string(),
  days: Joi.array().items(Joi.string().valid(Object.values(DAYS_OF_WEEK))),
  messages: Joi.object(),
  value_url: Joi.string().uri()
})

const policySchema = Joi.object().keys({
  name: Joi.string().required(),
  description: Joi.string().required(),
  policy_id: Joi.string()
    .guid()
    .required(),
  start_date: Joi.date()
    .timestamp('javascript')
    .required(),
  end_date: Joi.date()
    .timestamp('javascript')
    .allow(null),
  prev_policies: Joi.array()
    .items(Joi.string().guid())
    .allow(null),
  provider_ids: Joi.array()
    .items(Joi.string().guid())
    .allow(null),
  rules: Joi.array()
    .min(1)
    .items(ruleSchema)
    .required()
})

const policiesSchema = Joi.array().items(policySchema)

const featureSchema = Joi.object()
  .keys({
    type: Joi.string()
      .valid(['Feature'])
      .required(),
    properties: Joi.object().required(),
    geometry: Joi.object().required()
  })
  .unknown(true) // TODO

const featureCollectionSchema = Joi.object()
  .keys({
    type: Joi.string()
      .valid(['FeatureCollection'])
      .required(),
    features: Joi.array()
      .min(1)
      .items(featureSchema)
      .required()
  })
  .unknown(true) // TODO

const geographiesSchema = Joi.array().items(
  Joi.object()
    .keys({
      geography_id: Joi.string()
        .guid()
        .required(),
      geography_json: featureCollectionSchema,
      read_only: Joi.boolean().allow(null),
      previous_geography_ids: Joi.array()
        .items(Joi.string().guid())
        .allow(null),
      name: Joi.string().required()
    })
    .unknown(true)
)

const eventsSchema = Joi.array().items(
  Joi.object().keys({
    device_id: Joi.string()
      .guid()
      .required(),
    provider_id: Joi.string()
      .guid()
      .required(),
    timestamp: Joi.date()
      .timestamp('javascript')
      .required(),
    event_type: Joi.string().valid(Object.values(VEHICLE_EVENTS)),
    event_type_reason: Joi.string(),
    telemetry_timestamp: Joi.date().timestamp('javascript'),
    telemetry: Joi.object(), // TODO Add telemetry schema
    trip_id: Joi.string().guid(),
    service_area_id: Joi.string().guid(),
    recorded: Joi.date().timestamp('javascript')
  })
)

const vehicleEventTypeSchema = stringSchema.valid(Object.keys(VEHICLE_EVENTS))

const auditEventTypeSchema = (accept?: AUDIT_EVENT_TYPE[]): Joi.StringSchema =>
  stringSchema.valid(accept || Object.keys(AUDIT_EVENT_TYPES))

const auditIssueCodeSchema = stringSchema.max(31)

const auditNoteSchema = stringSchema.max(255)

const Format = (property: string, error: Joi.ValidationError): string => {
  const [{ message, path }] = error.details
  const [, ...details] = message.split(' ')
  return `${[property, ...path].join('.')} ${details.join(' ')}`
}

const Validate = (value: unknown, schema: Joi.Schema, options: Partial<ValidatorOptions>): boolean => {
  const { assert = true, required = true, property = 'value' } = options
  const { error } = Joi.validate(value, schema, { presence: required ? 'required' : 'optional' })
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
  Validate(
    value,
    numberSchema
      .min(options.min === undefined ? Number.MIN_SAFE_INTEGER : options.min)
      .max(options.max === undefined ? Number.MAX_SAFE_INTEGER : options.max),
    options
  )

export const isValidAuditTripId = (
  audit_trip_id: unknown,
  options: Partial<ValidatorOptions> = {}
): audit_trip_id is UUID => Validate(audit_trip_id, uuidSchema, { property: 'audit_trip_id', ...options })

interface AuditEventValidatorOptions extends ValidatorOptions {
  accept: AUDIT_EVENT_TYPE[]
}

export const isValidDeviceId = (value: unknown, options: Partial<ValidatorOptions> = {}): value is UUID =>
  Validate(value, uuidSchema, { property: 'device_id', ...options })

export const isValidAuditEventType = (
  value: unknown,
  { accept, ...options }: Partial<AuditEventValidatorOptions> = {}
): value is AUDIT_EVENT_TYPE =>
  Validate(value, auditEventTypeSchema(accept), { property: 'audit_event_type', ...options })

export const isValidTimestamp = (value: unknown, options: Partial<ValidatorOptions> = {}): value is Timestamp =>
  Validate(value, timestampSchema, { property: 'timestamp', ...options })

export const isValidProviderId = (value: unknown, options: Partial<ValidatorOptions> = {}): value is UUID =>
  Validate(value, providerIdSchema, { property: 'provider_id', ...options })

export const isValidProviderVehicleId = (value: unknown, options: Partial<ValidatorOptions> = {}): value is string =>
  Validate(value, vehicleIdSchema, { property: 'provider_vehicle_id', ...options })

export const isValidAuditEventId = (value: unknown, options: Partial<ValidatorOptions> = {}): value is UUID =>
  Validate(value, uuidSchema, { property: 'audit_event_id', ...options })

export const isValidAuditDeviceId = (value: unknown, options: Partial<ValidatorOptions> = {}): value is UUID =>
  Validate(value, uuidSchema, { property: 'audit_device_id', ...options })

export const isValidTelemetry = (value: unknown, options: Partial<ValidatorOptions> = {}): value is Telemetry =>
  Validate(value, telemetrySchema, { property: 'telemetry', ...options })

export const isValidVehicleEventType = (
  value: unknown,
  options: Partial<ValidatorOptions> = {}
): value is VEHICLE_EVENT => Validate(value, vehicleEventTypeSchema, { property: 'vehicle_event_type', ...options })

export const isValidAuditIssueCode = (value: unknown, options: Partial<ValidatorOptions> = {}): value is string =>
  Validate(value, auditIssueCodeSchema, { property: 'audit_issue_code', ...options })

export const isValidAuditNote = (value: unknown, options: Partial<ValidatorOptions> = {}): value is string =>
  Validate(value, auditNoteSchema, { property: 'note', ...options })

const HasPropertyAssertion = <T>(obj: unknown, ...props: (keyof T)[]): obj is T =>
  typeof obj === 'object' && obj !== null && props.every(prop => prop in obj)

export const isStringifiedTelemetry = (telemetry: unknown): telemetry is StringifiedTelemetry =>
  HasPropertyAssertion<StringifiedTelemetry>(telemetry, 'gps')

export const isStringifiedEventWithTelemetry = (event: unknown): event is StringifiedEventWithTelemetry =>
  HasPropertyAssertion<StringifiedEventWithTelemetry>(event, 'event_type', 'telemetry')

export const isStringifiedCacheReadDeviceResult = (device: unknown): device is StringifiedCacheReadDeviceResult =>
  HasPropertyAssertion<StringifiedCacheReadDeviceResult>(device, 'device_id', 'provider_id', 'type', 'propulsion')

export function validatePolicies(policies: unknown): policies is Policy[] {
  const { error } = Joi.validate(policies, policiesSchema)
  if (error) {
    throw new ValidationError('invalid_policies', {
      policies,
      details: Format('policies', error)
    })
  }
  return true
}

export function validateGeographies(geographies: unknown): geographies is Geography[] {
  const { error } = Joi.validate(geographies, geographiesSchema)
  if (error) {
    throw new ValidationError('invalid_geographies', {
      geographies,
      details: Format('geographies', error)
    })
  }
  return true
}

export function validateEvents(events: unknown): events is VehicleEvent[] {
  const { error } = Joi.validate(events, eventsSchema)
  if (error) {
    throw new ValidationError('invalid events', {
      events,
      details: Format('events', error)
    })
  }
  return true
}
export const policySchemaJson = joiToJsonSchema(policySchema)