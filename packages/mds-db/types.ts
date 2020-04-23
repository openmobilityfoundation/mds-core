import {
  Recorded,
  UUID,
  Timestamp,
  VehicleEvent,
  TelemetryData,
  VEHICLE_TYPE,
  PROPULSION_TYPE,
  Nullable
} from '@mds-core/mds-types'
import { FeatureCollection } from 'geojson'

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
  get_published: Nullable<boolean>
  get_unpublished: Nullable<boolean>
  geography_ids?: UUID[]
}

export interface PublishGeographiesParams {
  publish_date?: Timestamp
  geography_id: UUID
}
