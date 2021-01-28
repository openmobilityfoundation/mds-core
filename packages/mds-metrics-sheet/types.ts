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

import { UUID, VEHICLE_STATUS, VEHICLE_EVENT } from '@mds-core/mds-types'

export interface VehicleCountRow {
  provider_id: UUID
  provider: string
  count: number
  status: { [s in VEHICLE_STATUS]: number }
  event_type: { [s in VEHICLE_EVENT]: number }
  areas: { [s: string]: number }
}

export type VehicleCountResponse = VehicleCountRow[]

export interface LastDayStatsResponse {
  [s: string]: {
    trips_last_24h?: number
    ms_since_last_event?: 5582050
    event_counts_last_24h?: { [s in VEHICLE_EVENT]: number }
    late_event_counts_last_24h?: { [s in VEHICLE_EVENT]: number }
    telemetry_counts_last_24h?: number
    late_telemetry_counts_last_24h?: number
    events_last_24h?: number
    events_not_in_conformance?: number
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
