import { UUID } from 'mds-types'
import { MultiPolygon } from 'geojson'
import { ApiRequest, ApiResponse } from 'mds-api-server'
import { ApiAuthorizerClaims } from 'mds-api-authorizer'

export type AgencyApiRequest = ApiRequest
export interface AgencyApiResponse extends ApiResponse {
  locals: {
    claims: ApiAuthorizerClaims
    provider_id: UUID
  }
}

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
