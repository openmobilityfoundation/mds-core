import { UUID, VEHICLE_STATUS, VEHICLE_EVENT } from '@mds-core/mds-types'

interface VehicleCountRow {
  provider_id: UUID
  provider: string
  count: number
  status: { [s in VEHICLE_STATUS]: number }
  event_type: { [s in VEHICLE_EVENT]: number }
  areas: { [s: string]: number }
  areas_48h: { [s: string]: number }
}

export type VehicleCountResponse = VehicleCountRow[]

export interface LastDayStatsResponse {
  [s: string]: {
    trips_last_24h: number
    ms_since_last_event: 5582050
    event_counts_last_24h?: { [s in VEHICLE_EVENT]: number }
    late_event_counts_last_24h: { [s in VEHICLE_EVENT]: number }
    telemetry_counts_last_24h: number
    late_telemetry_counts_last_24h: number
    events_last_24h: number
    events_not_in_conformance: number
    name: string
  }
}

export interface MetricsSheetRow {
  date: string
  name: string
  registered: number
  deployed: number
  validtrips: string
  trips: number
  servicestart: number
  providerdropoff: number
  tripstart: number
  tripend: number
  tripenter: number
  tripleave: number
  telemetry: number
  telemetrysla: number
  tripstartsla: number
  tripendsla: number
}
