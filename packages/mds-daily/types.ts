import { UUID } from 'mds'
import { MultiPolygon } from 'geojson'
import { ApiRequest, ApiResponse } from 'mds-api-server'

export type DailyApiRequest = ApiRequest
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
