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
import { FeatureCollection } from 'geojson'
import { AUDIT_EVENT_TYPE, VehicleEvent, VEHICLE_EVENT } from './event'
import { Timestamp, UUID } from './utils'
import { Device } from './device'
import { Telemetry, TelemetryData, WithGpsProperty } from './telemetry'

// Represents a row in the "attachments" table
export interface Attachment {
  attachment_filename: string
  attachment_id: UUID
  base_url: string
  mimetype: string
  thumbnail_filename?: string | null
  thumbnail_mimetype?: string | null
  attachment_list_id?: UUID | null
  recorded?: Timestamp | null
}

export interface AttachmentSummary {
  attachment_id: UUID
  attachment_url: string
  thumbnail_url?: string | null
}

// Represents a row in the "audits" table
export interface Audit {
  audit_trip_id: UUID
  audit_device_id: UUID
  audit_subject_id: string
  provider_id: UUID
  provider_name: string
  provider_vehicle_id: string
  provider_device_id: UUID | null
  timestamp: Timestamp
  recorded: Timestamp
}

// Represents a row in the "audit_attachments" table
export interface AuditAttachment {
  attachment_id: UUID
  audit_trip_id: UUID
  recorded: Timestamp
}

// Represents a row in the "audit_events" table
export interface AuditEvent extends TelemetryData {
  audit_trip_id: UUID
  audit_event_id: UUID
  audit_event_type: AUDIT_EVENT_TYPE | VEHICLE_EVENT
  audit_issue_code?: string | null
  audit_subject_id: string
  note?: string | null
  timestamp: Timestamp
  recorded: Timestamp
}

export interface AuditDetails extends Audit {
  events: WithGpsProperty<AuditEvent>[]
  provider_event_types?: string[] | null
  provider_vehicle_state?: string | null
  provider_telemetry?: Telemetry | null
  provider_event_time?: Timestamp | null
  attachments: AttachmentSummary[]
  provider: null | {
    device: Device
    events: VehicleEvent[]
    telemetry: Telemetry[]
  }
}

// We don't put the publish_date into the geography_json column
// as we do with the Policy type, because we don't want to mess with
// the geojson FeatureCollection type.
export interface Geography {
  geography_id: UUID
  geography_json: FeatureCollection
  prev_geographies?: UUID[]
  name: string
  publish_date?: Timestamp
  effective_date?: Timestamp
  description?: string
}

export type GeographySummary = Omit<Geography, 'geography_json'>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface GeographyMetadata<M extends {} = Record<string, any>> {
  geography_id: UUID
  geography_metadata: M
}

export interface ErrorObject {
  error: string
  error_description: string
}

// The above types represent objects that can be created and passed into functions that write to the database. The
// following type alias allows wrapping the above types with Recorded<> in order to represent what is read from the
// database. This type alias will add the identity column, add the readonly attribute to all properties, and also
// remove undefined as a valid value since the database will never return undefined.
export type Recorded<T> = Readonly<Required<T & { id: number }>>

export interface BBox {
  latMin: number
  latMax: number
  lngMin: number
  lngMax: number
}
export type BoundingBox = [[number, number], [number, number]]

export interface Provider {
  provider_id: UUID
  provider_name: string
  url?: string
  mds_api_url?: string
  gbfs_api_url?: string
}

export * from './utils'
export * from './device'
export * from './event'
export * from './event_states_maps'
export * from './policy'
export * from './telemetry'
export * from './transformers'
export * from './trip'
export * from './vehicle/vehicle_states'
export * from './vehicle/vehicle_types'
