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

export const Enum = <T extends string>(...keys: T[]) =>
  Object.freeze(
    keys.reduce((e, key) => {
      return { ...e, [key]: key }
    }, {}) as { [K in T]: K }
  )

export const isEnum = (enums: { [key: string]: string }, value: unknown) =>
  typeof value === 'string' && typeof enums === 'object' && enums[value] === value

export const VEHICLE_TYPES = Enum('car', 'bicycle', 'scooter', 'moped', 'recumbent')
export type VEHICLE_TYPE = keyof typeof VEHICLE_TYPES

export const RULE_TYPES = Enum('count', 'speed', 'time', 'user')
export type RULE_TYPE = keyof typeof RULE_TYPES

export const PROPULSION_TYPES = Enum('human', 'electric', 'electric_assist', 'hybrid', 'combustion')
export type PROPULSION_TYPE = keyof typeof PROPULSION_TYPES

export const VEHICLE_STATUSES = Enum('available', 'reserved', 'unavailable', 'removed', 'inactive', 'trip', 'elsewhere')
export type VEHICLE_STATUS = keyof typeof VEHICLE_STATUSES

export const RIGHT_OF_WAY_STATUSES = ['available', 'reserved', 'unavailable', 'trip']

export const VEHICLE_EVENTS = Enum(
  'register',
  'service_start',
  'service_end',
  'provider_drop_off',
  'provider_pick_up',
  'agency_pick_up',
  'agency_drop_off',
  'reserve',
  'cancel_reservation',
  'trip_start',
  'trip_enter',
  'trip_leave',
  'trip_end',
  'deregister'
)

export type VEHICLE_EVENT = keyof typeof VEHICLE_EVENTS

export const VEHICLE_REASONS = Enum(
  'battery_charged',
  'charge',
  'compliance',
  'decommissioned',
  'low_battery',
  'maintenance',
  'missing',
  'off_hours',
  'rebalance'
)
export type VEHICLE_REASON = keyof typeof VEHICLE_REASONS

export const AUDIT_EVENT_TYPES = Enum('start', 'note', 'summary', 'issue', 'telemetry', 'end')
export type AUDIT_EVENT_TYPE = keyof typeof AUDIT_EVENT_TYPES

export const EVENT_STATUS_MAP: { [P in VEHICLE_EVENT]: VEHICLE_STATUS } = {
  register: VEHICLE_STATUSES.removed,
  service_start: VEHICLE_STATUSES.available,
  service_end: VEHICLE_STATUSES.unavailable,
  provider_drop_off: VEHICLE_STATUSES.available,
  provider_pick_up: VEHICLE_STATUSES.removed,
  agency_pick_up: VEHICLE_STATUSES.removed,
  agency_drop_off: VEHICLE_STATUSES.available,
  reserve: VEHICLE_STATUSES.reserved,
  cancel_reservation: VEHICLE_STATUSES.available,
  trip_start: VEHICLE_STATUSES.trip,
  trip_enter: VEHICLE_STATUSES.trip,
  trip_leave: VEHICLE_STATUSES.elsewhere,
  trip_end: VEHICLE_STATUSES.available,
  deregister: VEHICLE_STATUSES.inactive
}

const StatusEventMap = <T extends { [S in VEHICLE_STATUS]: Partial<typeof VEHICLE_EVENTS> }>(map: T) => map

export const STATUS_EVENT_MAP = StatusEventMap({
  available: Enum(
    VEHICLE_EVENTS.service_start,
    VEHICLE_EVENTS.provider_drop_off,
    VEHICLE_EVENTS.cancel_reservation,
    VEHICLE_EVENTS.agency_drop_off
  ),
  reserved: Enum(VEHICLE_EVENTS.reserve),
  unavailable: Enum(VEHICLE_EVENTS.service_end, VEHICLE_EVENTS.trip_end),
  trip: Enum(VEHICLE_EVENTS.trip_start, VEHICLE_EVENTS.trip_enter),
  elsewhere: Enum(VEHICLE_EVENTS.trip_leave),
  removed: Enum(VEHICLE_EVENTS.register, VEHICLE_EVENTS.provider_pick_up, VEHICLE_EVENTS.agency_pick_up),
  inactive: Enum(VEHICLE_EVENTS.deregister)
})

export const DAYS_OF_WEEK = Enum('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat')
export type DAY_OF_WEEK = keyof typeof DAYS_OF_WEEK
export const TIME_FORMAT = 'HH:mm:ss'

/**
 * @format uuid
 * @title A UUID used to uniquely identifty an object
 * @examples ["3c9604d6-b5ee-11e8-96f8-529269fb1459"]
 * @pattern ^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$
 */
export type UUID = string

export type Timestamp = number
export type TimestampInSeconds = number
export type Stringify<T> = { [P in keyof T]: string }
export type Nullable<T> = T | null
export type NullableProperties<T extends object> = {
  [P in keyof T]-?: T[P] extends null ? T[P] : Nullable<T[P]>
}
export type SingleOrArray<T> = T | T[]
export type NullableKeys<T> = {
  [P in keyof T]: null extends T[P] ? P : never
}[keyof T]
export type Optional<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>
export type NonEmptyArray<T> = [T, ...T[]]
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K }[keyof T]
export type OptionalKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never }[keyof T]
export type PickRequired<T> = Pick<T, RequiredKeys<T>>
export type PickOptional<T> = Pick<T, OptionalKeys<T>>
export type NullableOptional<T> = PickRequired<T> & NullableProperties<PickOptional<T>>

// Represents a row in the "devices" table
export interface Device {
  device_id: UUID
  provider_id: UUID
  vehicle_id: string
  type: VEHICLE_TYPE
  propulsion: PROPULSION_TYPE[]
  year?: number | null
  mfgr?: string | null
  model?: string | null
  recorded: Timestamp
  status?: VEHICLE_STATUS | null
}

export type DeviceID = Pick<Device, 'provider_id' | 'device_id'>

// Represents a row in the "events" table
// Named "VehicleEvent" to avoid confusion with the DOM's Event interface
export interface VehicleEvent {
  device_id: UUID
  provider_id: UUID
  timestamp: Timestamp
  timestamp_long?: string | null
  delta?: Timestamp | null
  event_type: VEHICLE_EVENT
  event_type_reason?: VEHICLE_REASON | null
  telemetry_timestamp?: Timestamp | null
  telemetry?: Telemetry | null
  trip_id?: UUID | null
  service_area_id?: UUID | null
  recorded: Timestamp
}

// Standard telemetry columns (used in more than one table)
export interface TelemetryData {
  lat: number
  lng: number
  speed?: number | null
  heading?: number | null
  accuracy?: number | null
  hdop?: number | null
  altitude?: number | null
  satellites?: number | null
  charge?: number | null
}

export type GpsData = Omit<TelemetryData, 'charge'>

// While telemetry data is stored in a flattened format, when passed as a parameter it has
// a different shape: { gps: { lat, lng, speed, heading, accurace, altitude } charge }. This
// type alias defines the parameter shape using the types of the underlying flattened data.

export type WithGpsProperty<T extends TelemetryData> = Omit<T, keyof Omit<TelemetryData, 'charge'>> & {
  gps: Omit<TelemetryData, 'charge'>
}

export interface Telemetry extends WithGpsProperty<TelemetryData> {
  provider_id: UUID
  device_id: UUID
  timestamp: Timestamp
  recorded?: Timestamp
}

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
  provider_event_type?: string | null
  provider_event_type_reason?: string | null
  provider_status?: string | null
  provider_telemetry?: Telemetry | null
  provider_event_time?: Timestamp | null
  attachments: AttachmentSummary[]
  provider: null | {
    device: Device
    events: VehicleEvent[]
    telemetry: Telemetry[]
  }
}

export interface PolicyMessage {
  [key: string]: string
}

interface BaseRule<RuleType extends 'count' | 'speed' | 'time' | 'user'> {
  name: string
  rule_id: UUID
  geographies: UUID[]
  statuses: Partial<{ [S in VEHICLE_STATUS]: (keyof typeof STATUS_EVENT_MAP[S])[] | [] }> | null
  rule_type: RuleType
  vehicle_types?: VEHICLE_TYPE[] | null
  maximum?: number | null
  minimum?: number | null
  start_time?: string | null
  end_time?: string | null
  days?: DAY_OF_WEEK[] | null
  /* eslint-reason TODO: message types haven't been defined well yet */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  messages?: PolicyMessage
  value_url?: URL | null
}

export type CountRule = BaseRule<'count'>

export interface TimeRule extends BaseRule<'time'> {
  rule_units: 'minutes' | 'hours'
}

export interface SpeedRule extends BaseRule<'speed'> {
  rule_units: 'kph' | 'mph'
}

export type UserRule = BaseRule<'user'>

export type Rule = CountRule | TimeRule | SpeedRule | UserRule

export interface BasePolicy {
  name: string
  description: string
  provider_ids?: UUID[]
  published_date?: Timestamp
  policy_id: UUID
  start_date: Timestamp
  end_date: Timestamp | null
  prev_policies: UUID[] | null
  publish_date?: Timestamp
}

export interface Policy extends BasePolicy {
  rules: Rule[]
}

export const RATE_RECURRENCE_VALUES = ['once', 'each_time_unit', 'per_complete_time_unit'] as const
export type RATE_RECURRENCE = typeof RATE_RECURRENCE_VALUES[number]

/**
 * A RateRule is a rule of any type that has a `rate_amount` property.
 * @alpha Out-of-spec for MDS 0.4.1
 */
export type RateRule = Rule & { rate_amount: number }

/**
 * A RatePolicy is a policy whose rules are RateRules.
 * @alpha Out-of-spec for MDS 0.4.1
 */
export interface RatePolicy extends BasePolicy {
  rate_recurrence: RATE_RECURRENCE
  currency: string
  rules: RateRule[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PolicyMetadata<M extends {} = Record<string, any>> {
  policy_id: UUID
  policy_metadata: M
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

export interface GeographyMetadata<M extends {} = Record<string, any>> {
  geography_id: UUID
  geography_metadata: M
}

export interface ErrorObject {
  error: string
  error_description: string
}

export interface CountMap {
  [P: string]: number
}

export interface TripsStats {
  single: number
  singles: CountMap
  mysteries: CountMap
  mystery_examples: { [key: string]: UUID[] }
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

// eslint-reason recursive declarations require interfaces
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsonArray extends Array<Json> {}

export interface JsonObject {
  [property: string]: Json
}

export type JsonValue = string | number | boolean | JsonArray | JsonObject

export type Json = Nullable<JsonValue>
// eslint-reason Function and constructor inference must use a single rest parameter of type 'any[]'
/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyFunction<A = any> = (...args: any[]) => A
export type AnyConstructor<A = object> = new (...args: any[]) => A
