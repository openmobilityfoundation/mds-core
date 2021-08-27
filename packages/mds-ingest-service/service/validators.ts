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

import { SchemaValidator } from '@mds-core/mds-schema-validators'
import {
  ACCESSIBILITY_OPTIONS,
  MODALITIES,
  PROPULSION_TYPES,
  TRIP_STATES,
  UUID,
  VEHICLE_EVENTS,
  VEHICLE_STATES,
  VEHICLE_TYPES,
  WithNonNullableKeys
} from '@mds-core/mds-types'
import {
  DeviceDomainModel,
  EventAnnotationDomainCreateModel,
  EventDomainModel,
  GetVehicleEventsFilterParams,
  GetVehicleEventsOrderColumn,
  GetVehicleEventsOrderDirection,
  GROUPING_TYPES,
  TelemetryDomainModel
} from '../@types'

const uuidSchema = { type: 'string', format: 'uuid' }
const timestampSchema = { type: 'integer', minimum: 100_000_000_000, maximum: 99_999_999_999_999 }
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

export const { validate: validateTelemetryDomainModel, $schema: TelemetrySchema } =
  SchemaValidator<TelemetryDomainModel>(
    {
      $id: 'Telemetry',
      type: 'object',
      properties: {
        device_id: uuidSchema,
        provider_id: uuidSchema,
        timestamp: timestampSchema,
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

export const { validate: validateEventDomainModel, $schema: EventSchema } = SchemaValidator<
  WithNonNullableKeys<EventDomainModel, 'telemetry'>
>(
  {
    $id: 'Event',
    type: 'object',
    properties: {
      device_id: uuidSchema,
      provider_id: uuidSchema,
      timestamp: timestampSchema,
      event_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: [...new Set(VEHICLE_EVENTS)]
        },
        minItems: 1
      },
      vehicle_state: {
        type: 'string',
        enum: [...new Set(VEHICLE_STATES)]
      },
      /** NOTE:
       * Telemetry is considered non-optional as of MDS 1.0, even though some legacy events do not have
       * telemetry (e.g. `register`). This is why the schema is more restrictive (non-nullable)
       * than the standard EventDomainModel, and why this returns a more restrictive type post-validation.
       */
      telemetry: TelemetrySchema,
      // ⬇⬇⬇ NULLABLE/OPTIONAL PROPERTIES ⬇⬇⬇
      trip_state: {
        type: 'string',
        enum: [...new Set(TRIP_STATES), null],
        nullable: true,
        default: null
      },
      telemetry_timestamp: nullableInteger,
      trip_id: { ...uuidSchema, nullable: true, default: null }
    },
    if: {
      properties: {
        event_types: {
          type: 'array',
          contains: {
            type: 'string',
            enum: ['trip_start', 'trip_end', 'trip_enter_jurisdiction', 'trip_leave_jurisdiction']
          }
        }
      }
    },
    then: { properties: { trip_id: uuidSchema }, required: ['trip_id'] },
    required: ['device_id', 'provider_id', 'timestamp', 'event_types', 'vehicle_state', 'telemetry']
  },
  { useDefaults: true }
)

export const { validate: validateGetVehicleEventsFilterParams } = SchemaValidator<GetVehicleEventsFilterParams>({
  type: 'object',
  properties: {
    vehicle_types: { type: 'array', items: { type: 'string', enum: [...new Set(VEHICLE_TYPES)] } },
    propulsion_types: { type: 'array', items: { type: 'string', enum: [...PROPULSION_TYPES] } },
    provider_ids: { type: 'array', items: uuidSchema },
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
    device_ids: { type: 'array', items: uuidSchema },
    event_types: { type: 'array', items: { type: 'string', enum: [...new Set(VEHICLE_EVENTS)] } },
    limit: { type: 'integer' },
    order: {
      type: 'object',
      properties: {
        column: { type: 'string', enum: [...GetVehicleEventsOrderColumn] },
        direction: { type: 'string', enum: [...GetVehicleEventsOrderDirection] }
      },
      additionalProperties: false
    }
  },
  required: []
})

export const { validate: validateUUIDs } = SchemaValidator<UUID[]>({
  type: 'array',
  items: uuidSchema
})

export const { validate: validateEventAnnotationDomainCreateModels } = SchemaValidator<
  EventAnnotationDomainCreateModel[]
>({
  type: 'array',
  items: {
    type: 'object',
    properties: {
      device_id: uuidSchema,
      timestamp: timestampSchema,
      vehicle_id: { type: 'string' },
      vehicle_type: { type: 'string', enum: VEHICLE_TYPES },
      propulsion_types: { type: 'array', items: { type: 'string', enum: PROPULSION_TYPES } },
      geography_ids: { type: 'array', items: uuidSchema },
      geography_types: { type: 'array', items: nullableString },
      latency_ms: { type: 'integer' }
    },
    required: [
      'device_id',
      'timestamp',
      'vehicle_id',
      'vehicle_type',
      'propulsion_types',
      'geography_ids',
      'geography_types',
      'latency_ms'
    ]
  }
})
