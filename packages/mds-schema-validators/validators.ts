/**
 * Copyright 2019 City of Los Angeles
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

import { providers } from '@mds-core/mds-providers' // map of uuids -> obb
import {
  ACCESSIBILITY_OPTIONS,
  AUDIT_EVENT_TYPE,
  AUDIT_EVENT_TYPES,
  DAYS_OF_WEEK,
  Device,
  Geography,
  MODALITIES,
  ModalityPolicy,
  PROPULSION_TYPES,
  RATE_RECURRENCE_VALUES,
  RULE_TYPES,
  Telemetry,
  Timestamp,
  TRIP_STATES,
  UUID,
  VehicleEvent,
  VEHICLE_EVENT,
  VEHICLE_EVENTS,
  VEHICLE_EVENTS_v1_1_0,
  VEHICLE_STATES,
  VEHICLE_STATES_v1_1_0,
  VEHICLE_TYPES
} from '@mds-core/mds-types'
import { areThereCommonElements, ValidationError } from '@mds-core/mds-utils'
import * as Joi from 'joi'
import joiToJson from 'joi-to-json'

export { ValidationError }

export interface ValidatorOptions {
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

export const vehicleIdSchema = stringSchema.max(255)

export const telemetrySchema = Joi.object().keys({
  gps: Joi.object()
    .keys({
      lat: numberSchema.min(-90).max(90).required(),
      lng: numberSchema.min(-180).max(180).required(),
      speed: numberSchema.optional().allow(null),
      heading: numberSchema.optional().allow(null),
      accuracy: numberSchema.optional().allow(null),
      hdop: numberSchema.optional().allow(null),
      altitude: numberSchema.optional().allow(null),
      satellites: numberSchema.optional().allow(null)
    })
    .required(),
  charge: numberSchema.optional(),
  provider_id: providerIdSchema.optional(),
  device_id: uuidSchema.optional(),
  timestamp: timestampSchema.required(),
  recorded: timestampSchema.optional()
})

export const baseRuleSchema = Joi.object().keys({
  accessibility_options: Joi.array()
    .items(Joi.string().valid(...ACCESSIBILITY_OPTIONS))
    .optional(),
  days: Joi.array().items(Joi.string().valid(...Object.values(DAYS_OF_WEEK))),
  end_time: Joi.string(),
  geographies: Joi.array().items(uuidSchema),
  maximum: Joi.number(),
  messages: Joi.object(),
  minimum: Joi.number(),
  modality: Joi.string()
    .valid(...MODALITIES)
    .optional(),
  name: Joi.string().required(),
  rule_id: Joi.string().guid().required(),
  rule_units: Joi.string().valid('seconds', 'minutes', 'hours', 'mph', 'kph'),
  start_time: Joi.string(),
  states: Joi.object().pattern(Joi.string(), Joi.string()).allow(null),
  value_url: Joi.string().uri(),
  vehicle_types: Joi.array().items(Joi.string().valid(...Object.values(VEHICLE_TYPES)))
})

export const modalityRuleSchema = baseRuleSchema.keys({
  states: Joi.object()
    .keys(
      VEHICLE_STATES_v1_1_0.reduce(
        (acc, state) =>
          Object.assign(acc, { [state]: Joi.array().items(stringSchema.valid(...VEHICLE_EVENTS_v1_1_0)) }),
        {}
      )
    )
    .allow(null),
  rule_type: Joi.string().valid(RULE_TYPES.count, RULE_TYPES.speed, RULE_TYPES.time, RULE_TYPES.user).required()
})

const rateRuleSchema = modalityRuleSchema.keys({
  rate_amount: Joi.number(),
  rate_recurrence: Joi.string().valid(...RATE_RECURRENCE_VALUES),
  rule_type: Joi.string().valid(RULE_TYPES.rate).required()
})

export const basePolicySchema = Joi.object().keys({
  name: Joi.string().required(),
  description: Joi.string().required(),
  policy_id: Joi.string().guid().allow(null),
  start_date: Joi.date().timestamp('javascript').required(),
  publish_date: Joi.date().timestamp('javascript').allow(null),
  end_date: Joi.date().timestamp('javascript').allow(null),
  prev_policies: Joi.array().items(Joi.string().guid()).allow(null),
  provider_ids: Joi.array().items(Joi.string().guid()).allow(null)
})

export const modalityPolicySchema = basePolicySchema.keys({
  rules: Joi.array().min(1).items(modalityRuleSchema).required()
})

export const ratePolicySchema = basePolicySchema.keys({
  rules: Joi.array().min(1).items(rateRuleSchema).required(),
  currency: Joi.string()
})

const modalityPoliciesSchema = Joi.array().items(modalityPolicySchema)

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

export const vehicleEventTypeSchema = stringSchema.valid(...VEHICLE_EVENTS)

const vehicleTypeSchema = stringSchema.valid(...Object.keys(VEHICLE_TYPES))

const propulsionTypeSchema = stringSchema.valid(...Object.keys(PROPULSION_TYPES))

export const vehicleStatusSchema = stringSchema.valid(...VEHICLE_STATES)

export const accessibilityOptionsSchema = stringSchema.valid(...ACCESSIBILITY_OPTIONS)

const modalitySchema = stringSchema.valid(...MODALITIES)

const eventSchema = Joi.object().keys({
  device_id: uuidSchema.required(),
  provider_id: uuidSchema.required(),
  timestamp: timestampSchema.required(),
  timestamp_long: stringSchema.optional(),
  delta: timestampSchema.optional(),
  event_types: Joi.array().items(vehicleEventTypeSchema).required(),
  telemetry_timestamp: timestampSchema.optional(),
  telemetry: telemetrySchema.allow(null).optional(),
  trip_id: uuidSchema.allow(null).optional(),
  vehicle_state: vehicleStatusSchema.allow(null).optional(),
  trip_state: stringSchema
    .valid(...TRIP_STATES)
    .allow(null)
    .optional(),
  recorded: timestampSchema.optional()
})

const eventsSchema = Joi.array().items(eventSchema)

const tripEventSchema = eventSchema.keys({
  trip_id: uuidSchema.required()
})

const auditEventTypeSchema = (accept?: AUDIT_EVENT_TYPE[]): Joi.StringSchema =>
  stringSchema.valid(...(accept || Object.keys(AUDIT_EVENT_TYPES)))

const auditIssueCodeSchema = stringSchema.max(31)

const auditNoteSchema = stringSchema.max(255)

const deviceSchema = Joi.object().keys({
  accessibility_options: Joi.array().items(accessibilityOptionsSchema).required(),
  device_id: uuidSchema.required(),
  provider_id: uuidSchema.required(),
  vehicle_id: stringSchema.required(),
  vehicle_type: vehicleTypeSchema.required(),
  propulsion_types: Joi.array().items(propulsionTypeSchema).required(),
  year: numberSchema.optional(),
  mfgr: stringSchema.optional(),
  modality: modalitySchema.required(),
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

export const isValidUUID = (value: unknown): value is string => ValidateSchema(value, uuidSchema)

export const isValidAuditTripId = (
  audit_trip_id: unknown,
  options: Partial<ValidatorOptions> = {}
): audit_trip_id is UUID => ValidateSchema(audit_trip_id, uuidSchema, { property: 'audit_trip_id', ...options })

interface AuditEventValidatorOptions extends ValidatorOptions {
  accept: AUDIT_EVENT_TYPE[]
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

export function validateModalityPolicies(policies: unknown): policies is ModalityPolicy[] {
  const { error } = modalityPoliciesSchema.validate(policies)
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

export function validateModalityPolicy(policy: ModalityPolicy): policy is ModalityPolicy {
  const { error } = modalityPolicySchema.validate(policy, { allowUnknown: false })
  if (error) {
    throw new ValidationError('invalid micromobility policy', {
      details: error.details
    })
  }
  return true
}

export function geographyValidationDetails(geography: Geography): Joi.ValidationErrorItem[] | null {
  const { error } = geographySchema.validate(geography, { allowUnknown: false })
  if (error) {
    return error.details
  }
  return null
}

const validateTripEvent = (event: VehicleEvent) => ValidateSchema(event, tripEventSchema, {})

const validate_v1_0_0_Event = (event: unknown) => {
  if (isValidEvent(event, { allowUnknown: true })) {
    const { event_types } = event

    const TRIP_EVENTS: VEHICLE_EVENT[] = [
      'trip_start',
      'trip_end',
      'trip_enter_jurisdiction',
      'trip_leave_jurisdiction'
    ]

    if (areThereCommonElements(TRIP_EVENTS, event_types)) {
      return validateTripEvent(event)
    }

    return ValidateSchema(event, eventSchema, {})
  }
}

export const validateEvent = validate_v1_0_0_Event

export const modalityPolicySchemaJson = joiToJson(modalityPolicySchema)

export const SchemaBuilder = Joi
