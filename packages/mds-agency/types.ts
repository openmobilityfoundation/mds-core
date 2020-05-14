import { UUID, Device, VehicleEvent, Telemetry, Timestamp, Recorded, VEHICLE_STATUS, Stop } from '@mds-core/mds-types'
import { MultiPolygon } from 'geojson'
import { ApiRequest, ApiVersionedResponse, ApiClaims } from '@mds-core/mds-api-server'
import { Params, ParamsDictionary } from 'express-serve-static-core'

export const AGENCY_API_SUPPORTED_VERSIONS = ['0.4.1'] as const
export type AGENCY_API_SUPPORTED_VERSION = typeof AGENCY_API_SUPPORTED_VERSIONS[number]
export const [AGENCY_API_DEFAULT_VERSION] = AGENCY_API_SUPPORTED_VERSIONS

export type AgencyApiRequest<P extends Params = ParamsDictionary> = ApiRequest<P>

export type AgencyApiAccessTokenScopes = 'admin:all' | 'vehicles:read'

export type AgencyApiResponse<TBody = any> = ApiVersionedResponse<
  AGENCY_API_SUPPORTED_VERSION,
  ApiClaims<AgencyApiAccessTokenScopes> & {
    provider_id: UUID
  },
  TBody
>

export type AgencyRegisterVehicleResponse = AgencyApiResponse<{}>

export type AgencyGetVehicleByIdResponse = AgencyApiResponse<CompositeVehicle>
export type AgencyGetVehiclesByProviderResponse = AgencyApiResponse<PaginatedVehiclesList>
export type AgencyUpdateVehicleResponse = AgencyApiResponse<{}>
export type AgencySubmitVehicleEventResponse = AgencyApiResponse<{
  device_id: UUID
  status: VEHICLE_STATUS
}>

export type AgencySubmitVehicleTelemetryResponse = AgencyApiResponse<{
  result: string
  recorded: Timestamp
  unique: number
  failures: string[]
}>

export type AgencyRegisterStopResponse = AgencyApiResponse<Recorded<Stop>>
export type AgencyReadStopResponse = AgencyApiResponse<Recorded<Stop>>
export type AgencyReadStopsResponse = AgencyApiResponse<{
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
