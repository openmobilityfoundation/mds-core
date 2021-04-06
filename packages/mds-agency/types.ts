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

import {
  UUID,
  Device,
  VehicleEvent,
  Telemetry,
  Timestamp,
  Recorded,
  VEHICLE_EVENT,
  VEHICLE_STATE
} from '@mds-core/mds-types'
import { MultiPolygon } from 'geojson'
import {
  ApiRequest,
  ApiResponse,
  ApiResponseLocals,
  ApiRequestParams,
  ApiResponseLocalsClaims,
  ApiResponseLocalsVersion
} from '@mds-core/mds-api-server'

export const AGENCY_API_SUPPORTED_VERSIONS = ['0.4.1', '1.0.0'] as const
export type AGENCY_API_SUPPORTED_VERSION = typeof AGENCY_API_SUPPORTED_VERSIONS[number]
export const [AGENCY_API_DEFAULT_VERSION] = AGENCY_API_SUPPORTED_VERSIONS // default has to be oldest, because we didn't used to require a version

export type AgencyApiRequest<B = {}> = ApiRequest<B>

export type AgencyApiRegisterVehicleRequest = AgencyApiRequest<Device>
export type AgencyApiGetVehicleByIdRequest = AgencyApiRequest & ApiRequestParams<'device_id'>
export type AgencyApiGetVehiclesByProviderRequest = AgencyApiRequest
export type AgencyApiUpdateVehicleRequest = AgencyApiRequest<Device> & ApiRequestParams<'device_id'>
export type AgencyApiSubmitVehicleEventRequest = AgencyApiRequest<VehicleEvent> & ApiRequestParams<'device_id'>
export type AgencyApiSubmitVehicleTelemetryRequest = AgencyApiRequest<{ data: Telemetry[] }>

export type AgencyApiAccessTokenScopes = 'admin:all' | 'vehicles:read'

export type AgencyApiResponse<B = {}> = ApiResponse<B> &
  ApiResponseLocalsClaims<AgencyApiAccessTokenScopes> &
  ApiResponseLocals<'provider_id', UUID> &
  ApiResponseLocalsVersion<AGENCY_API_SUPPORTED_VERSION>

export type AgencyApiRegisterVehicleResponse = AgencyApiResponse

export type AgencyAipGetVehicleByIdResponse = AgencyApiResponse<CompositeVehicle>
export type AgencyApiGetVehiclesByProviderResponse = AgencyApiResponse<PaginatedVehiclesList>
export type AgencyApiUpdateVehicleResponse = AgencyApiResponse
export type AgencyApiSubmitVehicleEventResponse = AgencyApiResponse<{
  device_id: UUID
  state: VEHICLE_STATE
}>

export type AgencyApiSubmitVehicleTelemetryResponse = AgencyApiResponse<{
  result: string
  recorded: Timestamp
  unique: number
  failures: string[]
}>

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

export interface VehiclePayload {
  device?: Device
  event?: VehicleEvent
  telemetry?: Telemetry
}

export type TelemetryResult =
  | Telemetry
  | Readonly<
      Required<
        Telemetry & {
          id: number
        }
      >
    >[]

export type CompositeVehicle = Partial<
  Device & { prev_events?: VEHICLE_EVENT[]; updated?: Timestamp; gps?: Recorded<Telemetry>['gps'] }
>

export type PaginatedVehiclesList = {
  total: number
  links: { first: string; last: string; prev: string | null; next: string | null }
  vehicles: (Device & { updated?: number | null; telemetry?: Telemetry | null })[]
}
