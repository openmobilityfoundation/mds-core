import { Timestamp, UUID } from './utils'

// Standard telemetry columns (used in more than one table)
export interface GpsData {
  lat: number
  lng: number
  speed?: number | null
  heading?: number | null
  accuracy?: number | null
  hdop?: number | null
  altitude?: number | null
  satellites?: number | null
}

export interface TelemetryData extends GpsData {
  charge?: number | null
}

// While telemetry data is stored in a flattened format, when passed as a parameter it has
// a different shape: { gps: { lat, lng, speed, heading, accurace, altitude } charge }. This
// type alias defines the parameter shape using the types of the underlying flattened data.

export type WithGpsProperty<T extends TelemetryData> = Omit<T, keyof GpsData> & {
  gps: GpsData
}

export interface Telemetry {
  provider_id: UUID
  device_id: UUID
  timestamp: Timestamp
  recorded?: Timestamp
  gps: GpsData
  charge?: number | null
  stop_id?: UUID | null
}
