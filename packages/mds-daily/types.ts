import { UUID } from '@mds-core/mds-types'
import { MultiPolygon } from 'geojson'
import { ApiRequest, ApiResponse } from '@mds-core/mds-api-server'
import { Params, ParamsDictionary } from 'express-serve-static-core'

export type DailyApiRequest<P extends Params = ParamsDictionary> = ApiRequest<P>
export type DailyApiResponse = ApiResponse

export interface ServiceArea {
  service_area_id: UUID
  start_date: number
  end_date: number
  prev_area: UUID
  replacement_area: UUID
  type: string
  description: string
  area: MultiPolygon
}

export interface ProviderInfo {
  [p: string]: {
    name: string
    events_last_24h: number
    trips_last_24h: number
    ms_since_last_event: number
    event_counts_last_24h: { [s: string]: number }
    late_event_counts_last_24h: { [s: string]: number }
    telemetry_counts_last_24h: number
    late_telemetry_counts_last_24h: number
    registered_last_24h: number
    events_not_in_conformance: number
  }
}

export interface DbHelperArgs {
  start_time?: number
  end_time?: number
  provider_info: ProviderInfo
  fail: (err: Error | string) => Promise<void>
}
