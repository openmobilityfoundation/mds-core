import { Timestamp, UUID } from './utils'

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
