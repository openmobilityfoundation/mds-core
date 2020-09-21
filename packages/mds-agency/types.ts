import { UUID, Device, VehicleEvent, Telemetry, Timestamp, Recorded, VEHICLE_STATUS, Stop } from '@mds-core/mds-types'
import { MultiPolygon } from 'geojson'
import {
  ApiRequest,
  ApiResponse,
  ApiResponseLocals,
  ApiRequestParams,
  ApiResponseLocalsClaims
} from '@mds-core/mds-api-server'

export const AGENCY_API_SUPPORTED_VERSIONS = ['0.4.1'] as const
export type AGENCY_API_SUPPORTED_VERSION = typeof AGENCY_API_SUPPORTED_VERSIONS[number]
export const [AGENCY_API_DEFAULT_VERSION] = AGENCY_API_SUPPORTED_VERSIONS

export type AgencyApiRequest<B = {}> = ApiRequest<B>

export type AgencyApiRegisterVehicleRequest = AgencyApiRequest<Device>
export type AgencyApiGetVehicleByIdRequest = AgencyApiRequest & ApiRequestParams<'device_id'>
export type AgencyApiGetVehiclesByProviderRequest = AgencyApiRequest
export type AgencyApiUpdateVehicleRequest = AgencyApiRequest<Device> & ApiRequestParams<'device_id'>
export type AgencyApiSubmitVehicleEventRequest = AgencyApiRequest<VehicleEvent> & ApiRequestParams<'device_id'>
export type AgencyApiSubmitVehicleTelemetryRequest = AgencyApiRequest<{ data: Telemetry[] }>
export type AgencyApiRegisterStopRequest = AgencyApiRequest<Stop>
export type AgencyApiReadStopRequest = AgencyApiRequest & ApiRequestParams<'stop_id'>

export type AgencyApiAccessTokenScopes = 'admin:all' | 'vehicles:read'

export type AgencyApiResponse<B = {}> = ApiResponse<B> &
  ApiResponseLocalsClaims<AgencyApiAccessTokenScopes> &
  ApiResponseLocals<'provider_id', UUID>

export type AgencyApiRegisterVehicleResponse = AgencyApiResponse

export type AgencyAipGetVehicleByIdResponse = AgencyApiResponse<CompositeVehicle>
export type AgencyApiGetVehiclesByProviderResponse = AgencyApiResponse<PaginatedVehiclesList>
export type AgencyApiUpdateVehicleResponse = AgencyApiResponse
export type AgencyApiSubmitVehicleEventResponse = AgencyApiResponse<{
  device_id: UUID
  status: VEHICLE_STATUS
}>

export type AgencyApiSubmitVehicleTelemetryResponse = AgencyApiResponse<{
  result: string
  recorded: Timestamp
  unique: number
  failures: string[]
}>

export type AgencyApiRegisterStopResponse = AgencyApiResponse<Recorded<Stop>>
export type AgencyApiReadStopResponse = AgencyApiResponse<Recorded<Stop>>
export type AgencyApiReadStopsResponse = AgencyApiResponse<{
  stops: Readonly<
    Required<
      Stop & {
        id: number
      }
    >
  >[]
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
  Device & { prev_event?: string; updated?: Timestamp; gps?: Recorded<Telemetry>['gps'] }
>

export type PaginatedVehiclesList = {
  total: number
  links: { first: string; last: string; prev: string | null; next: string | null }
  vehicles: (Device & { updated?: number | null; telemetry?: Telemetry | null })[]
}
