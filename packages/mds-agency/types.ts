import { UUID, Device, VehicleEvent, Telemetry } from '@mds-core/mds-types'
import { MultiPolygon } from 'geojson'
import { ApiRequest, ApiResponse, ApiClaims } from '@mds-core/mds-api-server'
import { Params, ParamsDictionary } from 'express-serve-static-core'

export type AgencyApiRequest<P extends Params = ParamsDictionary> = ApiRequest<P>

export type AgencyApiAccessTokenScopes = 'admin:all' | 'vehicles:read'

export type AgencyApiResponse = ApiResponse<
  ApiClaims<AgencyApiAccessTokenScopes> & {
    provider_id: UUID
  }
>

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
