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

import { schemaValidator, SchemaValidator } from '@mds-core/mds-schema-validators'
import {
  ACCESSIBILITY_OPTIONS,
  MODALITIES,
  PROPULSION_TYPES,
  UUID,
  VEHICLE_EVENTS,
  VEHICLE_STATES,
  VEHICLE_TYPES
} from '@mds-core/mds-types'
import Joi from 'joi'
import {
  DeviceDomainModel,
  EventDomainModel,
  GetVehicleEventsFilterParams,
  GROUPING_TYPES,
  TelemetryDomainModel
} from '../@types'

const uuidSchema = { type: 'string', format: 'uuid' }
const nullableInteger = { type: 'integer', nullable: true, default: null }
const nullableFloat = { type: 'number', format: 'float', nullable: true, default: null }
const nullableString = { type: 'string', nullable: true, default: null }

export const { validate: validateDeviceDomainModel, $schema: DeviceSchema } = SchemaValidator<DeviceDomainModel>(
  {
    $id: 'Device',
    type: 'object',
    properties: {
      device_id: uuidSchema,
      provider_id: uuidSchema,
      vehicle_id: {
        type: 'string'
      },
      vehicle_type: { type: 'string', enum: VEHICLE_TYPES },
      propulsion_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: PROPULSION_TYPES
        }
      },
      accessibility_options: {
        type: 'array',
        items: {
          type: 'string',
          enum: ACCESSIBILITY_OPTIONS
        },
        default: []
      },
      modality: { type: 'string', enum: MODALITIES, default: 'micromobility' },
      // ⬇⬇⬇ NULLABLE/OPTIONAL PROPERTIES ⬇⬇⬇
      year: nullableInteger,
      mfgr: nullableString,
      model: nullableString
    },
    required: ['device_id', 'provider_id', 'vehicle_id', 'vehicle_type', 'propulsion_types']
  },
  { useDefaults: true }
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

export const { validate: validateTelemetryDomainModel, $schema: TelemetrySchema } =
  SchemaValidator<TelemetryDomainModel>(
    {
      $id: 'Telemetry',
      type: 'object',
      properties: {
        device_id: uuidSchema,
        provider_id: uuidSchema,
        timestamp: { type: 'integer' },
        gps: {
          type: 'object',
          properties: {
            lat: { type: 'number', format: 'float' },
            lng: { type: 'number', format: 'float' },
            // ⬇⬇⬇ NULLABLE/OPTIONAL PROPERTIES ⬇⬇⬇
            altitude: nullableFloat,
            heading: nullableFloat,
            speed: nullableFloat,
            accuracy: nullableFloat,
            hdop: nullableFloat,
            satellites: nullableInteger
          },
          required: ['lat', 'lng']
        },
        // ⬇⬇⬇ NULLABLE/OPTIONAL PROPERTIES ⬇⬇⬇
        charge: { ...nullableFloat, minimum: 0, maximum: 1.0 },
        stop_id: { ...uuidSchema, nullable: true, default: null }
      },
      required: ['device_id', 'provider_id', 'timestamp', 'gps']
    },
    { useDefaults: true }
  )

export const { validate: validateEventDomainModel, isValid: isValidEventDomainModel } =
  schemaValidator<DeviceDomainModel>(
    Joi.object<EventDomainModel>()
      .keys({
        device_id: Joi.string().uuid().required(),
        provider_id: Joi.string().uuid().required(),
        timestamp: Joi.number().required(),
        event_types: Joi.array()
          .valid(Joi.string().valid(...VEHICLE_EVENTS))
          .required(),
        vehicle_state: Joi.string().valid(...VEHICLE_STATES),
        telemetry_timestamp: Joi.number().allow(null),
        telemetry: telemetrySchema.allow(null),
        trip_id: Joi.string().uuid().allow(null),
        service_area_id: Joi.string().uuid().allow(null)
      })
      .unknown(false)
  )

export const { validate: validateGetVehicleEventsFilterParams } = SchemaValidator<GetVehicleEventsFilterParams>({
  type: 'object',
  properties: {
    vehicle_types: { type: 'array', items: { type: 'string', enum: [...new Set(VEHICLE_TYPES)] } },
    propulsion_types: { type: 'array', items: { type: 'string', enum: [...PROPULSION_TYPES] } },
    provider_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
    vehicle_states: { type: 'array', items: { type: 'string', enum: [...new Set(VEHICLE_STATES)] } },
    time_range: {
      type: 'object',
      properties: {
        start: { type: 'integer', nullable: false },
        end: { type: 'integer', nullable: false }
      }
    },
    grouping_type: { type: 'string', enum: [...GROUPING_TYPES] },
    vehicle_id: { type: 'string' },
    device_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
    event_types: { type: 'array', items: { type: 'string', enum: [...new Set(VEHICLE_EVENTS)] } },
    limit: { type: 'integer' }
  },
  required: ['time_range']
})

export const { validate: validateUUIDs } = SchemaValidator<UUID[]>({
  type: 'array',
  items: uuidSchema
})
