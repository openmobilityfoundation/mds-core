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

import { Enum } from '@mds-core/mds-types'

const TABLE = Enum(
  'attachments',
  'audits',
  'audit_attachments',
  'audit_events',
  'devices',
  'events',
  'geographies',
  'geography_metadata',
  'policies',
  'policy_metadata',
  'telemetry'
)
export type TABLE_NAME = keyof typeof TABLE

const TABLES = Object.keys(TABLE) as TABLE_NAME[]

const COLUMN = Enum(
  'accuracy',
  'accessibility_options',
  'address',
  'altitude',
  'attachment_filename',
  'attachment_id',
  'audit_device_id',
  'audit_event_id',
  'audit_event_type',
  'audit_issue_code',
  'audit_subject_id',
  'audit_trip_id',
  'base_url',
  'charge',
  'deleted',
  'description',
  'device_id',
  'effective_date',
  'end_time',
  'event_type', // deprecated 1.0 for event_types
  'event_types', // new in 1.0
  'event_type_reason', // deprecated 1.0, removed entirely
  'geography_id',
  'geography_json',
  'geography_metadata',
  'heading',
  'id',
  'lat',
  'lng',
  'mfgr',
  'mimetype',
  'modality',
  'model',
  'name',
  'note',
  'policy_id',
  'policy_json',
  'policy_metadata',
  'prev_geographies',
  'propulsion',
  'propulsion_type', // deprecated 1.0 for propulsion_types
  'propulsion_types', // new in 1.0
  'provider_device_id',
  'provider_id',
  'provider_name',
  'provider_vehicle_id',
  'publish_date',
  'recorded',
  'speed',
  'telemetry_timestamp',
  'thumbnail_filename',
  'thumbnail_mimetype',
  'timestamp',
  'trip_id',
  'trip_state', // new for Taxi
  'type', // deprecated 1.0 for vehicle_type
  'vehicle_state', // new in 1.0
  'vehicle_type', // new in 1.0
  'vehicle_id',
  'year'
)
export type COLUMN_NAME = keyof typeof COLUMN
const COLUMNS = Object.keys(COLUMN) as COLUMN_NAME[]

const TABLE_COLUMNS: { [T in TABLE_NAME]: Readonly<COLUMN_NAME[]> } = {
  [TABLE.attachments]: [
    COLUMN.id,
    COLUMN.attachment_filename,
    COLUMN.attachment_id,
    COLUMN.base_url,
    COLUMN.mimetype,
    COLUMN.thumbnail_filename,
    COLUMN.thumbnail_mimetype,
    COLUMN.recorded
  ],
  [TABLE.audit_attachments]: [COLUMN.id, COLUMN.attachment_id, COLUMN.audit_trip_id, COLUMN.recorded],
  [TABLE.audits]: [
    COLUMN.id,
    COLUMN.audit_trip_id,
    COLUMN.audit_device_id,
    COLUMN.audit_subject_id,
    COLUMN.provider_id,
    COLUMN.provider_name,
    COLUMN.provider_vehicle_id,
    COLUMN.provider_device_id,
    COLUMN.timestamp,
    COLUMN.deleted,
    COLUMN.recorded
  ],
  [TABLE.audit_events]: [
    COLUMN.id,
    COLUMN.audit_trip_id,
    COLUMN.audit_event_id,
    COLUMN.audit_event_type,
    COLUMN.audit_issue_code,
    COLUMN.audit_subject_id,
    COLUMN.note,
    COLUMN.timestamp,
    COLUMN.lat,
    COLUMN.lng,
    COLUMN.speed,
    COLUMN.heading,
    COLUMN.accuracy,
    COLUMN.altitude,
    COLUMN.charge,
    COLUMN.recorded
  ],
  [TABLE.devices]: [
    COLUMN.id,
    COLUMN.accessibility_options,
    COLUMN.device_id,
    COLUMN.provider_id,
    COLUMN.vehicle_id,
    // COLUMN.type, // deprecated 1.0
    COLUMN.vehicle_type, // added 1.0
    // COLUMN.propulsion, // deprecated 1.0
    COLUMN.propulsion_types, // added 1.0
    COLUMN.year,
    COLUMN.mfgr,
    COLUMN.modality,
    COLUMN.model,
    COLUMN.recorded
  ],
  [TABLE.events]: [
    COLUMN.id,
    COLUMN.device_id,
    COLUMN.provider_id,
    COLUMN.timestamp,
    // COLUMN.event_type, // deprecated 1.0
    COLUMN.event_types, // added 1.0
    // COLUMN.event_type_reason, // deprecated 1.0
    COLUMN.vehicle_state, // added 1.0
    COLUMN.telemetry_timestamp,
    COLUMN.trip_id,
    COLUMN.trip_state,
    COLUMN.recorded
  ],
  [TABLE.geographies]: [
    COLUMN.id,
    COLUMN.description,
    COLUMN.effective_date,
    COLUMN.geography_id,
    COLUMN.geography_json,
    COLUMN.publish_date,
    COLUMN.prev_geographies,
    COLUMN.name
  ],
  [TABLE.geography_metadata]: [COLUMN.id, COLUMN.geography_id, COLUMN.geography_metadata],
  [TABLE.policies]: [COLUMN.id, COLUMN.policy_id, COLUMN.policy_json],
  [TABLE.policy_metadata]: [COLUMN.id, COLUMN.policy_id, COLUMN.policy_metadata],
  [TABLE.telemetry]: [
    COLUMN.id,
    COLUMN.device_id,
    COLUMN.provider_id,
    COLUMN.timestamp,
    COLUMN.lat,
    COLUMN.lng,
    COLUMN.speed,
    COLUMN.heading,
    COLUMN.accuracy,
    COLUMN.altitude,
    COLUMN.charge,
    COLUMN.recorded
  ]
}

export default {
  COLUMN,
  COLUMNS,
  TABLE,
  TABLES,
  TABLE_COLUMNS
}
