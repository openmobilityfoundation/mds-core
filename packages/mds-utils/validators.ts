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
  AUDIT_EVENT_TYPES,
  VEHICLE_EVENTS,
  AUDIT_EVENT_TYPE,
  VEHICLE_EVENT,
  UUID,
  Timestamp,
  Telemetry
} from '@mds-core/mds-types'
import * as Joi from '@hapi/joi'
import {
  StringifiedTelemetry,
  StringifiedEventWithTelemetry,
  StringifiedCacheReadDeviceResult
} from '@mds-core/mds-cache/types'
import { ValidationError } from './exceptions'

interface ValidatorOptions {
  assert: boolean
  required: boolean
}

// Convert empty string to undefined so required/optional works as expected
const stringSchema = Joi.string().empty('')

const uuidSchema = stringSchema.guid()

const timestampSchema = Joi.number()
  .options({ convert: false })
  .min(1420099200000)

const providerIdSchema = uuidSchema.valid(Object.keys(providers))

const vehicleIdSchema = stringSchema.max(255)

const telemetrySchema = Joi.object().keys({
  gps: Joi.object()
    .keys({
      lat: Joi.number()
        .min(-90)
        .max(90)
        .required(),
      lng: Joi.number()
        .min(-180)
        .max(180)
        .required(),
      speed: Joi.number().optional(),
      heading: Joi.number().optional(),
      accuracy: Joi.number().optional(),
      altitude: Joi.number().optional()
    })
    .required(),
  charge: Joi.number().optional(),
  provider_id: providerIdSchema.optional(),
  device_id: uuidSchema.optional(),
  timestamp: timestampSchema.required()
})

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

const Validate = (
  property: string,
  value: unknown,
  schema: Joi.Schema,
  options: Partial<ValidatorOptions>
): boolean => {
  const { assert, required } = { assert: true, required: true, ...options }
  const { error } = Joi.validate(value, schema, { presence: required ? 'required' : 'optional' })
  if (error && assert) {
    throw new ValidationError(`invalid_${property}`.toLowerCase(), {
      [property]: value,
      details: Format(property, error)
    })
  }
  return !error
}

export const isValidAuditTripId = (
  audit_trip_id: unknown,
  options: Partial<ValidatorOptions> = {}
): audit_trip_id is UUID => Validate('audit_trip_id', audit_trip_id, uuidSchema, options)

interface AuditEventValidatorOptions extends ValidatorOptions {
  accept: AUDIT_EVENT_TYPE[]
}

export const isValidDeviceId = (device_id: unknown, options: Partial<ValidatorOptions> = {}): device_id is UUID =>
  Validate('device_id', device_id, uuidSchema, options)

export const isValidAuditEventType = (
  audit_event_type: unknown,
  { accept, ...options }: Partial<AuditEventValidatorOptions> = {}
): audit_event_type is AUDIT_EVENT_TYPE =>
  Validate('audit_event_type', audit_event_type, auditEventTypeSchema(accept), options)

export const isValidTimestamp = (timestamp: unknown, options: Partial<ValidatorOptions> = {}): timestamp is Timestamp =>
  Validate('timestamp', timestamp, timestampSchema, options)

export const isValidProviderId = (provider_id: unknown, options: Partial<ValidatorOptions> = {}): provider_id is UUID =>
  Validate('provider_id', provider_id, providerIdSchema, options)

export const isValidProviderVehicleId = (
  provider_vehicle_id: unknown,
  options: Partial<ValidatorOptions> = {}
): provider_vehicle_id is string => Validate('provider_vehicle_id', provider_vehicle_id, vehicleIdSchema, options)

export const isValidAuditEventId = (
  audit_event_id: unknown,
  options: Partial<ValidatorOptions> = {}
): audit_event_id is UUID => Validate('audit_event_id', audit_event_id, uuidSchema, options)

export const isValidAuditDeviceId = (
  audit_device_id: unknown,
  options: Partial<ValidatorOptions> = {}
): audit_device_id is UUID => Validate('audit_device_id', audit_device_id, uuidSchema, options)

export const isValidTelemetry = (telemetry: unknown, options: Partial<ValidatorOptions> = {}): telemetry is Telemetry =>
  Validate('telemetry', telemetry, telemetrySchema, options)

export const isValidVehicleEventType = (
  vehicle_event_type: unknown,
  options: Partial<ValidatorOptions> = {}
): vehicle_event_type is VEHICLE_EVENT =>
  Validate('vehicle_event_type', vehicle_event_type, vehicleEventTypeSchema, options)

export const isValidAuditIssueCode = (
  audit_issue_code: unknown,
  options: Partial<ValidatorOptions> = {}
): audit_issue_code is string => Validate('audit_issue_code', audit_issue_code, auditIssueCodeSchema, options)

export const isValidAuditNote = (note: unknown, options: Partial<ValidatorOptions> = {}): note is string =>
  Validate('note', note, auditNoteSchema, options)

export const isStringifiedTelemetry = (telemetry: unknown): telemetry is StringifiedTelemetry =>
  typeof telemetry === 'object' && telemetry !== null && 'gps' in telemetry

export const isStringifiedEventWithTelemetry = (event: unknown): event is StringifiedEventWithTelemetry =>
  typeof event === 'object' && event !== null && 'event_type' in event && 'telemetry' in event

export const isStringifiedCacheReadDeviceResult = (device: unknown): device is StringifiedCacheReadDeviceResult =>
  typeof device === 'object' &&
  device !== null &&
  'device_id' in device &&
  'provider_id' in device &&
  'type' in device &&
  'propulsion' in device
