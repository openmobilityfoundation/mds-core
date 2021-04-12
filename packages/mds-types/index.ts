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

export const VEHICLE_TYPES = Enum('car', 'bicycle', 'scooter', 'moped', 'other')
export type VEHICLE_TYPE = keyof typeof VEHICLE_TYPES

// TODO rate
export const RULE_TYPES = Enum('count', 'speed', 'time', 'user', 'rate')
export type RULE_TYPE = keyof typeof RULE_TYPES
export type MICROMOBILITY_RULE_TYPES = 'count' | 'speed' | 'time'

export const PROPULSION_TYPES = Enum('human', 'electric', 'electric_assist', 'hybrid', 'combustion')
export type PROPULSION_TYPE = keyof typeof PROPULSION_TYPES

export const MICRO_MOBILITY_VEHICLE_STATES_v1_1_0 = [
  'available',
  'elsewhere',
  'non_operational',
  'on_trip',
  'removed',
  'reserved',
  'unknown'
] as const
export type MICRO_MOBILITY_VEHICLE_STATE_v1_1_0 = typeof MICRO_MOBILITY_VEHICLE_STATES_v1_1_0[number]

export const MICRO_MOBILITY_VEHICLE_STATES = MICRO_MOBILITY_VEHICLE_STATES_v1_1_0
export type MICRO_MOBILITY_VEHICLE_STATE = MICRO_MOBILITY_VEHICLE_STATE_v1_1_0

export const TAXI_VEHICLE_STATES = [
  'available',
  'elsewhere',
  'non_operational',
  'on_trip',
  'removed',
  'reserved',
  'stopped',
  'unknown'
] as const
export type TAXI_VEHICLE_STATE = typeof TAXI_VEHICLE_STATES[number]

export const TNC_VEHICLE_STATE = <const>[
  'available',
  'elsewhere',
  'non_operational',
  'on_trip',
  'reserved',
  'stopped',
  'unknown'
]
export type TNC_VEHICLE_STATE = typeof TNC_VEHICLE_STATE[number]

export const VEHICLE_STATES_v1_1_0 = [
  ...MICRO_MOBILITY_VEHICLE_STATES_v1_1_0,
  ...TAXI_VEHICLE_STATES,
  ...TNC_VEHICLE_STATE
] as const
export type VEHICLE_STATE_v1_1_0 = typeof VEHICLE_STATES_v1_1_0[number]

export const VEHICLE_STATES = VEHICLE_STATES_v1_1_0
export type VEHICLE_STATE = VEHICLE_STATE_v1_1_0

export const RIGHT_OF_WAY_STATES = ['available', 'reserved', 'non_operational', 'trip'] as const

export const TRIP_STATES = ['on_trip', 'reserved', 'stopped'] as const
export type TRIP_STATE = typeof TRIP_STATES[number]

export const MICRO_MOBILITY_VEHICLE_EVENTS_v1_1_0 = [
  'agency_drop_off',
  'agency_pick_up',
  'battery_charged',
  'battery_low',
  'comms_lost',
  'comms_restored',
  'compliance_pick_up',
  'decommissioned',
  'located',
  'maintenance',
  'maintenance_pick_up',
  'missing',
  'off_hours',
  'on_hours',
  'provider_drop_off',
  'rebalance_pick_up',
  'reservation_cancel',
  'reservation_start',
  'system_resume',
  'system_suspend',
  'trip_cancel',
  'trip_end',
  'trip_enter_jurisdiction',
  'trip_leave_jurisdiction',
  'trip_start',
  'unspecified'
] as const
export type MICRO_MOBILITY_VEHICLE_EVENT_v1_1_0 = typeof MICRO_MOBILITY_VEHICLE_EVENTS_v1_1_0[number]

export const MICRO_MOBILITY_VEHICLE_EVENTS = MICRO_MOBILITY_VEHICLE_EVENTS_v1_1_0
export type MICRO_MOBILITY_VEHICLE_EVENT = MICRO_MOBILITY_VEHICLE_EVENT_v1_1_0

export const TAXI_VEHICLE_EVENTS = [
  'comms_lost',
  'comms_restored',
  'decommissioned',
  'maintenance_start',
  'maintenance_end',
  'driver_cancellation',
  'enter_jurisdiction',
  'leave_jurisdiction',
  'maintenance',
  'passenger_cancellation',
  'provider_cancellation',
  'recommissioned',
  'reservation_start',
  'reservation_stop',
  'service_end',
  'service_start',
  'trip_end',
  'trip_resume',
  'trip_start',
  'trip_stop'
] as const
export type TAXI_VEHICLE_EVENT = typeof TAXI_VEHICLE_EVENTS[number]

export const TNC_VEHICLE_EVENT = [
  'comms_lost',
  'comms_restored',
  'driver_cancellation',
  'enter_jurisdiction',
  'leave_jurisdiction',
  'maintenance',
  'passenger_cancellation',
  'provider_cancellation',
  'reservation_start',
  'reservation_stop',
  'service_end',
  'service_start',
  'trip_end',
  'trip_resume',
  'trip_start',
  'trip_stop',
  'unspecified'
] as const
export type TNC_VEHICLE_EVENT = typeof TNC_VEHICLE_EVENT[number]

export const TAXI_TRIP_EXIT_EVENTS: TAXI_VEHICLE_EVENT[] = [
  'trip_end',
  'leave_jurisdiction',
  'passenger_cancellation',
  'provider_cancellation',
  'driver_cancellation'
]

export const TNC_TRIP_EXIT_EVENTS: TNC_VEHICLE_EVENT[] = [
  'trip_end',
  'leave_jurisdiction',
  'passenger_cancellation',
  'provider_cancellation',
  'driver_cancellation'
]

export const VEHICLE_EVENTS_v1_1_0 = [
  ...MICRO_MOBILITY_VEHICLE_EVENTS,
  ...TAXI_VEHICLE_EVENTS,
  ...TNC_VEHICLE_EVENT
] as const
export type VEHICLE_EVENT_v1_1_0 = typeof VEHICLE_EVENTS[number]

export const VEHICLE_EVENTS = VEHICLE_EVENTS_v1_1_0
export type VEHICLE_EVENT = VEHICLE_EVENT_v1_1_0

export const AUDIT_EVENT_TYPES = Enum('start', 'note', 'summary', 'issue', 'telemetry', 'end')
export type AUDIT_EVENT_TYPE = keyof typeof AUDIT_EVENT_TYPES

// States you transition into based on event_type
export const MICRO_MOBILITY_EVENT_STATES_MAP: {
  [P in MICRO_MOBILITY_VEHICLE_EVENT]: MICRO_MOBILITY_VEHICLE_STATE[]
} = {
  agency_drop_off: ['available'],
  agency_pick_up: ['removed'],
  battery_charged: ['available'],
  battery_low: ['non_operational'],
  comms_lost: ['unknown'],
  comms_restored: ['available', 'elsewhere', 'non_operational', 'removed', 'reserved', 'on_trip'],
  compliance_pick_up: ['removed'],
  decommissioned: ['removed'],
  located: ['available', 'non_operational', 'reserved', 'on_trip', 'elsewhere'],
  maintenance: ['available', 'non_operational'],
  maintenance_pick_up: ['removed'],
  missing: ['unknown'],
  off_hours: ['non_operational'],
  on_hours: ['available'],
  provider_drop_off: ['available'],
  rebalance_pick_up: ['removed'],
  reservation_cancel: ['available'],
  reservation_start: ['reserved'],
  system_resume: ['available'],
  system_suspend: ['non_operational'],
  trip_cancel: ['available'],
  trip_end: ['available'],
  trip_enter_jurisdiction: ['on_trip'],
  trip_leave_jurisdiction: ['elsewhere'],
  trip_start: ['on_trip'],
  unspecified: ['available', 'elsewhere', 'non_operational', 'on_trip', 'removed', 'reserved', 'unknown']
}

export const TAXI_EVENT_STATES_MAP: {
  [P in TAXI_VEHICLE_EVENT]: TAXI_VEHICLE_STATE[]
} = {
  comms_lost: ['unknown'],
  comms_restored: ['available', 'non_operational', 'reserved', 'on_trip', 'elsewhere'],
  decommissioned: ['removed'],
  maintenance_start: ['removed'],
  maintenance_end: ['non_operational'],
  driver_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  enter_jurisdiction: ['available', 'reserved', 'on_trip', 'non_operational'],
  leave_jurisdiction: ['elsewhere'],
  maintenance: ['available', 'non_operational'],
  passenger_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  provider_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  recommissioned: ['non_operational'],
  reservation_start: ['reserved'],
  reservation_stop: ['stopped'],
  service_end: ['non_operational'],
  service_start: ['available'],
  trip_end: ['available', 'on_trip', 'reserved', 'stopped'],
  trip_resume: ['on_trip'],
  trip_start: ['on_trip'],
  trip_stop: ['stopped']
}

export const TNC_EVENT_STATES_MAP: {
  [P in TNC_VEHICLE_EVENT]: TNC_VEHICLE_STATE[]
} = {
  comms_lost: ['unknown'],
  comms_restored: ['available', 'non_operational', 'reserved', 'on_trip', 'elsewhere'],
  driver_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  enter_jurisdiction: ['available', 'reserved', 'on_trip', 'non_operational'],
  leave_jurisdiction: ['elsewhere'],
  maintenance: ['available', 'non_operational'],
  passenger_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  provider_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  reservation_start: ['reserved'],
  reservation_stop: ['stopped'],
  service_end: ['non_operational'],
  service_start: ['available'],
  trip_end: ['available', 'on_trip', 'reserved', 'stopped'],
  trip_resume: ['on_trip'],
  trip_start: ['on_trip'],
  trip_stop: ['stopped'],
  unspecified: ['available', 'non_operational']
}

const MicroMobilityStatusEventMap = <
  T extends { [S in MICRO_MOBILITY_VEHICLE_STATE]: Partial<MICRO_MOBILITY_VEHICLE_EVENT[]> }
>(
  map: T
) => map

// Given a state, list the valid entry events
export const MICRO_MOBILITY_STATE_EVENT_MAP = MicroMobilityStatusEventMap({
  available: [
    'battery_charged',
    'on_hours',
    'provider_drop_off',
    'agency_drop_off',
    'maintenance',
    'trip_end',
    'reservation_cancel',
    'trip_cancel',
    'system_resume',
    'maintenance_pick_up',
    'comms_restored',
    'unspecified'
  ],
  reserved: ['reservation_start', 'comms_restored'],
  non_operational: ['battery_low', 'maintenance', 'off_hours', 'system_suspend', 'unspecified', 'comms_restored'],
  on_trip: ['trip_start', 'trip_enter_jurisdiction', 'comms_restored'],
  elsewhere: ['trip_leave_jurisdiction', 'comms_restored'],
  removed: [
    'maintenance_pick_up',
    'rebalance_pick_up',
    'compliance_pick_up',
    'agency_pick_up',
    'decommissioned',
    'unspecified'
  ],
  unknown: ['comms_lost', 'missing', 'located']
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

export const ACCESSIBILITY_OPTIONS = ['wheelchair_accessible'] as const
export type ACCESSIBILITY_OPTION = typeof ACCESSIBILITY_OPTIONS[number]

export const MODALITIES = ['micromobility', 'taxi', 'tnc'] as const
export type MODALITY = typeof MODALITIES[number]

// Represents a row in the "devices" table
export interface CoreDevice {
  device_id: UUID
  provider_id: UUID
  vehicle_id: string
}

// Represents a row in the "devices" table
export interface Device_v1_1_0 extends CoreDevice {
  vehicle_type: VEHICLE_TYPE // changed name in 1.0
  accessibility_options?: ACCESSIBILITY_OPTION[]
  propulsion_types: PROPULSION_TYPE[] // changed name in 1.0
  year?: number | null
  mfgr?: string | null
  modality: MODALITY
  model?: string | null
  recorded: Timestamp
  state?: VEHICLE_STATE | null
}
/**
 * This is an alias that must be updated in the event of future changes to the type.
 */
export type Device = Device_v1_1_0

export type DeviceID = Pick<Device, 'provider_id' | 'device_id'>

export interface CoreEvent {
  device_id: UUID
  provider_id: UUID
  timestamp: Timestamp
  telemetry?: Telemetry | null
}

/**
 *  Represents a row in the "events" table
 * Named "VehicleEvent" to avoid confusion with the DOM's Event interface
 * Keeping 1_0_0 types in here and not in transformers/@types to avoid circular imports.
 * This alias must be updated if this type is updated.
 */
export interface VehicleEvent_v1_1_0 extends CoreEvent {
  timestamp_long?: string | null
  delta?: Timestamp | null
  event_types: VEHICLE_EVENT[]
  telemetry_timestamp?: Timestamp | null
  trip_id?: UUID | null
  vehicle_state: VEHICLE_STATE
  trip_state: Nullable<TRIP_STATE>
  recorded: Timestamp
}
export type VehicleEvent = VehicleEvent_v1_1_0

export interface MicroMobilityVehicleEvent extends VehicleEvent {
  event_types: MICRO_MOBILITY_VEHICLE_EVENT[]
  vehicle_state: MICRO_MOBILITY_VEHICLE_STATE
}

export interface TaxiVehicleEvent extends VehicleEvent {
  event_types: TAXI_VEHICLE_EVENT[]
  vehicle_state: TAXI_VEHICLE_STATE
}

export interface TNCVehicleEvent extends VehicleEvent {
  event_types: TNC_VEHICLE_EVENT[]
  vehicle_state: TNC_VEHICLE_STATE
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
  stop_id?: UUID | null
}

export const PAYMENT_METHODS = ['cash', 'card', 'equity_program'] as const
export type PAYMENT_METHOD = typeof PAYMENT_METHODS[number]

export const RESERVATION_METHODS = ['app', 'street_hail', 'phone_dispatch'] as const
export type RESERVATION_METHOD = typeof RESERVATION_METHODS[number]

export const RESERVATION_TYPES = ['on_demand', 'scheduled'] as const
export type RESERVATION_TYPE = typeof RESERVATION_TYPES[number]

export interface TripMetadata {
  trip_id: UUID
  provider_id: UUID
  reservation_time: Timestamp
  reservation_method: RESERVATION_METHOD
  reservation_type: RESERVATION_TYPE
  quoted_trip_start_time: Timestamp
  requested_trip_start_location?: Pick<GpsData, 'lat' | 'lng'>
  cancellation_reason?: string
  dispatch_time?: Timestamp
  trip_start_time?: Timestamp
  trip_end_time?: Timestamp
  distance?: number // Distance in meters
  accessibility_options?: ACCESSIBILITY_OPTION[]
  fare?: {
    quoted_cost?: number
    actual_cost?: number
    components?: { [entity: string]: number } // e.g. entity = 'LAX_AIRPORT_FEE'
    currency?: string
    payment_methods?: PAYMENT_METHOD[]
  }
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

export interface PolicyMessage {
  [key: string]: string
}

export type GenericStatesToEvents<S extends string = string, E extends string = string> = {
  [K in S]?: E[] | []
}

export type MicroMobilityStatesToEvents = {
  [S in MICRO_MOBILITY_VEHICLE_STATE]: MICRO_MOBILITY_VEHICLE_EVENT[] | []
}

export type TaxiStatesToEvents = {
  [S in TAXI_VEHICLE_STATE]: TAXI_VEHICLE_EVENT[] | []
}

export type TNCStatesToEvents = {
  [S in TNC_VEHICLE_STATE]: TNC_VEHICLE_EVENT[] | []
}

export interface BaseRule<StatesToEventsMap extends GenericStatesToEvents, RuleType extends RULE_TYPE = RULE_TYPE> {
  accessibility_options?: ACCESSIBILITY_OPTION[] | null
  days?: DAY_OF_WEEK[] | null
  end_time?: string | null
  geographies: UUID[]
  maximum?: number | null
  /* eslint-reason TODO: message types haven't been defined well yet */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  messages?: PolicyMessage
  minimum?: number | null
  modality?: MODALITY
  name: string
  rule_id: UUID
  rule_type: RuleType
  rule_units?: string
  start_time?: string | null
  states: StatesToEventsMap | null
  value_url?: URL | null
  vehicle_types?: string[] | null
}

export interface MicroMobilityRule<RuleType extends 'count' | 'speed' | 'time' | 'user'>
  extends BaseRule<Partial<MicroMobilityStatesToEvents>, RuleType> {
  modality?: 'micromobility'
}

export interface TaxiRule<RuleType extends 'count' | 'speed' | 'time' | 'user'>
  extends BaseRule<Partial<TaxiStatesToEvents>, RuleType> {
  modality: 'taxi'
}

export interface TNCRule<RuleType extends 'count' | 'speed' | 'time' | 'user'>
  extends BaseRule<Partial<TNCStatesToEvents>, RuleType> {
  modality: 'tnc'
}

export type ModalityRule<RuleType extends 'count' | 'speed' | 'time' | 'user'> =
  | MicroMobilityRule<RuleType>
  | TaxiRule<RuleType>
  | TNCRule<RuleType>

export type CountRule = ModalityRule<'count'>

export type TimeRule = ModalityRule<'time'> & {
  rule_units: 'minutes' | 'hours'
}

export type SpeedRule = ModalityRule<'speed'> & {
  rule_units: 'kph' | 'mph'
}

export type UserRule = ModalityRule<'user'>

export type Rule = CountRule | TimeRule | SpeedRule | UserRule

export type BasePolicy<
  StatesToEventsMap extends GenericStatesToEvents,
  RuleType extends RULE_TYPE,
  R extends BaseRule<StatesToEventsMap, RuleType>
> = {
  name: string
  description: string
  provider_ids?: UUID[]
  published_date?: Timestamp
  policy_id: UUID
  start_date: Timestamp
  end_date: Timestamp | null
  prev_policies: UUID[] | null
  rules: R[]
  publish_date?: Timestamp
}

export type ModalityStatesToEvents =
  | Partial<MicroMobilityStatesToEvents>
  | Partial<TNCStatesToEvents>
  | Partial<TaxiStatesToEvents>

export type ModalityPolicy = BasePolicy<ModalityStatesToEvents, RULE_TYPE, ModalityRule<Exclude<RULE_TYPE, 'rate'>>>

export type PolicyTypeInfo<
  StatesToEventsMap extends GenericStatesToEvents = GenericStatesToEvents,
  RuleType extends RULE_TYPE = RULE_TYPE,
  Rule extends BaseRule<StatesToEventsMap, RuleType> = BaseRule<StatesToEventsMap, RuleType>
> = {
  StatesToEventMap: StatesToEventsMap
  RuleType: RuleType
  Rule: Rule
  Policy: BasePolicy<StatesToEventsMap, RuleType, Rule>
}

export type ModalityPolicyTypeInfo = PolicyTypeInfo<
  ModalityStatesToEvents,
  Exclude<RULE_TYPE, 'rate'>,
  ModalityRule<Exclude<RULE_TYPE, 'rate'>>
>

export type ModalityCountPolicy = BasePolicy<ModalityStatesToEvents, 'count', CountRule>
export type ModalitySpeedPolicy = BasePolicy<ModalityStatesToEvents, 'speed', SpeedRule>
export type ModalityTimePolicy = BasePolicy<ModalityStatesToEvents, 'time', TimeRule>

export const RATE_RECURRENCE_VALUES = ['once', 'each_time_unit', 'per_complete_time_unit'] as const
export type RATE_RECURRENCE = typeof RATE_RECURRENCE_VALUES[number]

/**
 * A RateRule is a rule of any type that has a `rate_amount` property.
 * @alpha Out-of-spec for MDS 0.4.1
 */
export type RateRule<StatesToEventMap extends GenericStatesToEvents> = BaseRule<StatesToEventMap, 'rate'> & {
  rate_amount: number
  rate_recurrence: RATE_RECURRENCE
}

/**
 * A RatePolicy is a policy whose rules are RateRules.
 * @alpha Out-of-spec for MDS 0.4.1
 */
export interface RatePolicy<StatesToEventMap extends GenericStatesToEvents>
  extends BasePolicy<StatesToEventMap, 'rate', RateRule<StatesToEventMap>> {
  currency: string
  rules: RateRule<StatesToEventMap>[]
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
