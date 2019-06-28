import {
  AUDIT_EVENT_TYPE,
  VEHICLE_EVENT,
  DAY_OF_WEEK,
  VEHICLE_TYPE,
  PROPULSION_TYPE,
  VEHICLE_STATUS,
  STATUS_EVENT_MAP
} from 'mds-enums'
import { Feature, FeatureCollection } from 'geojson'

/**
 * @format uuid
 * @title A UUID used to uniquely identifty an object
 * @examples ["3c9604d6-b5ee-11e8-96f8-529269fb1459"]
 * @pattern ^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$
 */
export type UUID = string

export type Timestamp = number
export type Stringify<T> = { [P in keyof T]: string }

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
  event_type_reason?: string | null
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
  provider: null | {
    device: Device
    events: VehicleEvent[]
    telemetry: Telemetry[]
  }
}

interface BaseRule {
  name: string
  rule_id: UUID
  geographies: UUID[]
  statuses: Partial<{ [S in keyof typeof STATUS_EVENT_MAP]: (keyof typeof STATUS_EVENT_MAP[S])[] | [] }>
  rule_type: 'count' | 'speed' | 'time'
  vehicle_types?: VEHICLE_TYPE[] | null
  maximum?: number | null
  minimum?: number | null
  start_time?: string | null
  end_time?: string | null
  days?: DAY_OF_WEEK[] | null
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  messages?: any
  value_url?: URL | null
}

export interface CountRule extends BaseRule {
  rule_type: 'count'
}

export interface TimeRule extends BaseRule {
  rule_type: 'time'
  rule_units: 'minutes' | 'hours'
}

export interface SpeedRule extends BaseRule {
  rule_type: 'speed'
  rule_units: 'kph' | 'mph'
}

export type Rule = CountRule | TimeRule | SpeedRule

export interface Policy {
  name: string
  description: string
  policy_id: UUID
  start_date: Timestamp
  end_date: Timestamp | null
  prev_policies: UUID[] | null
  rules: Rule[]
}

export interface MatchedVehicle {
  device_id: UUID
  provider_id: UUID
  vehicle_id: string
  vehicle_type: VEHICLE_TYPE
  vehicle_status: VEHICLE_STATUS
  gps: {
    lat: number
    lng: number
  }
}

export interface CountMatch {
  measured: number
  geography_id: UUID
  matched_vehicles: MatchedVehicle[]
}

export interface TimeMatch {
  measured: number
  geography_id: UUID
  matched_vehicle: MatchedVehicle
}

export interface Compliance {
  rule: Rule
  matches: CountMatch[] | TimeMatch[] | null // TODO Support for Speed issues.
}

export interface ComplianceResponse {
  policy: Policy
  compliance: Compliance[]
}

export interface Geography {
  geography_id: UUID
  geography_json: Feature | FeatureCollection
}

export interface ErrorObject {
  error: string
  error_description: string
}

export type CountMap<T extends {}> = { [P in keyof T]: number }

// The above types represent objects that can be created and passed into functions that write to the database. The
// following type alias allows wrapping the above types with Recorded<> in order to represent what is read from the
// database. This type alias will add the readonly attribute to all properties and also remove undefined as a valid
// value since the database will never return undefined.
export type Recorded<T> = Readonly<Required<T>>

export interface BoundingBox {
  latMin: number
  latMax: number
  lngMin: number
  lngMax: number
}

export interface Provider {
  provider_name: string
  url?: string
  mds_api_url?: string
}
