import { Recorded, UUID, Timestamp, VehicleEvent, TelemetryData } from 'mds'
import { VEHICLE_TYPE, PROPULSION_TYPE } from 'mds-enums'
import { Feature, FeatureCollection } from 'geojson'
import schema from './schema'

export interface ReadEventsResult {
  events: Recorded<VehicleEvent>[]
  count: number
}

export interface Trip {
  provider_id: UUID
  provider_name: string
  device_id: UUID
  vehicle_id: string
  vehicle_type: VEHICLE_TYPE
  propulsion_type: PROPULSION_TYPE[]
  provider_trip_id: UUID
  trip_start?: Timestamp | null
  first_trip_enter?: Timestamp | null
  last_trip_leave?: Timestamp | null
  trip_end?: Timestamp | null
  trip_duration?: number | null
  trip_distance?: number | null
  route?: FeatureCollection | null
  accuracy?: number | null
  parking_verification_url?: string | null
  standard_cost?: number | null
  actual_cost?: number | null
  recorded: Timestamp
  sequence?: number | null
}

// TODO move to mds-db?
export interface ReadTripsResult {
  count: number
  trips: Trip[]
}

// TODO move to mds-db?
export interface ReadTripIdsResult {
  count: number
  tripIds: UUID[]
}

export interface StatusChange {
  provider_id: UUID
  provider_name: string
  device_id: UUID
  vehicle_id: string
  vehicle_type: VEHICLE_TYPE
  propulsion_type: PROPULSION_TYPE[]
  event_type: string // FIXME enum
  event_type_reason: string // FIXME enum
  event_time: Timestamp
  event_location: Feature | null
  battery_pct: number | null
  associated_trip: UUID | null
  recorded: Timestamp
  sequence?: number | null
}

export type StatusChangeEvent = Pick<StatusChange, 'event_type' | 'event_type_reason'>

// TODO move to mds-db?
export interface ReadStatusChangesResult {
  count: number
  status_changes: StatusChange[]
}

// Represents a row in the "telemetry" table
export interface TelemetryRecord extends TelemetryData {
  device_id: UUID
  provider_id: UUID
  timestamp: Timestamp
  recorded: Timestamp
}

export interface ReadEventsQueryParams {
  skip?: number | string
  take?: number | string
  start_time?: number | string
  end_time?: number | string
  min_end_time?: number | string
  max_end_time?: number | string
  start_recorded?: string
  end_recorded?: string
  event_types?: string[]
  device_id?: UUID
  trip_id?: UUID
  vehicle_id?: string
  provider_id?: UUID
}

export interface VehicleEventCountResult {
  count: number
  events: Recorded<VehicleEvent>[]
}

export type DEVICES_COL = typeof schema.DEVICES_COLS[number]
export type EVENTS_COL = typeof schema.EVENTS_COLS[number]
export type TELEMETRY_COL = typeof schema.TELEMETRY_COLS[number]
export type TRIPS_COL = typeof schema.TRIPS_COLS[number]
export type STATUS_CHANGES_COL = typeof schema.STATUS_CHANGES_COLS[number]
export type AUDITS_COL = typeof schema.AUDITS_COLS[number]
export type AUDIT_EVENTS_COL = typeof schema.AUDITS_COLS[number]
export type POLICIES_COL = typeof schema.POLICIES_COLS[number]
export type GEOGRAPHIES_COL = typeof schema.GEOGRAPHIES_COLS
