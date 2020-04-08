import { Timestamp, Nullable, Telemetry, NullableProperties } from '@mds-core/mds-types'
import { MessageLabeler } from './types'

export interface TelemetryLabel {
  telemetry_timestamp: Timestamp
  telemetry_lat: number
  telemetry_lng: number
  telemetry_altitude: Nullable<number>
  telemetry_heading: Nullable<number>
  telemetry_speed: Nullable<number>
  telemetry_accuracy: Nullable<number>
  telemetry_charge: Nullable<number>
}

export const TelemetryLabeler: () => MessageLabeler<{ telemetry: Telemetry }, TelemetryLabel> = () => async ({
  telemetry
}) => {
  const { timestamp, gps } = telemetry
  return {
    telemetry_timestamp: timestamp,
    telemetry_lat: gps.lat,
    telemetry_lng: gps.lng,
    telemetry_altitude: gps.altitude ?? null,
    telemetry_heading: gps.heading ?? null,
    telemetry_speed: gps.speed ?? null,
    telemetry_accuracy: gps.accuracy ?? null,
    telemetry_charge: telemetry.charge ?? null
  }
}

export const OptionalTelemetryLabeler: () => MessageLabeler<
  { telemetry?: Nullable<Telemetry> },
  NullableProperties<TelemetryLabel>
> = () => async ({ telemetry }) => {
  if (telemetry) return TelemetryLabeler()({ telemetry })

  return {
    telemetry_timestamp: null,
    telemetry_lat: null,
    telemetry_lng: null,
    telemetry_altitude: null,
    telemetry_heading: null,
    telemetry_speed: null,
    telemetry_accuracy: null,
    telemetry_charge: null
  }
}
