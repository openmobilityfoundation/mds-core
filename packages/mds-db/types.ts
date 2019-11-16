import {
  Recorded,
  UUID,
  Timestamp,
  VehicleEvent,
  TelemetryData,
  VEHICLE_TYPE,
  PROPULSION_TYPE,
  PROVIDER_EVENT,
  PROVIDER_REASON
} from '@mds-core/mds-types'
import { Feature, FeatureCollection } from 'geojson'

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
}

export interface StatusChange {
  provider_id: UUID
  provider_name: string
  device_id: UUID
  vehicle_id: string
  vehicle_type: VEHICLE_TYPE
  propulsion_type: PROPULSION_TYPE[]
  event_type: PROVIDER_EVENT
  event_type_reason: PROVIDER_REASON
  event_time: Timestamp
  event_location: Feature | null
  battery_pct: number | null
  associated_trip: UUID | null
  recorded: Timestamp
}

export type StatusChangeEvent = Pick<StatusChange, 'event_type' | 'event_type_reason'>

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
  start_recorded?: string
  end_recorded?: string
  device_id?: UUID
  trip_id?: UUID
}

export interface ReadHistoricalEventsQueryParams {
  provider_id?: UUID
  end_date: number
}

export type ReadAuditsQueryParams = Partial<{
  skip: number
  take: number
  provider_id: UUID
  provider_vehicle_id: string
  audit_subject_id: string
  start_time: Timestamp
  end_time: Timestamp
}>

export interface VehicleEventCountResult {
  count: number
  events: Recorded<VehicleEvent>[]
}

export interface ReadGeographiesParams {
  get_read_only: boolean
}

export interface PublishGeographiesParams {
  publish_date: Timestamp
  geography_id: UUID
}
