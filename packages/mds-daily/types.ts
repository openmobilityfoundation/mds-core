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

import { UUID } from '@mds-core/mds-types'
import { MultiPolygon } from 'geojson'
import { ApiRequest, ApiResponse, ApiRequestParams, ApiResponseLocalsClaims } from '@mds-core/mds-api-server'

export type DailyApiRequest<B = {}> = ApiRequest<B>

export type DailyApiGetRawTripDataRequest = DailyApiRequest & ApiRequestParams<'trip_id'>

export type DailyApiAccessTokenScopes = 'admin:all'

export type DailyApiResponse<B = {}> = ApiResponse<B> & ApiResponseLocalsClaims<DailyApiAccessTokenScopes>

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
