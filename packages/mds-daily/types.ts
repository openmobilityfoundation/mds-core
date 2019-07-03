import express from 'express'
import { UUID } from 'mds'
import { MultiPolygon } from 'geojson'

// TODO this is same as ProviderApiRequest
export interface AgencyApiRequest extends express.Request {
  apiGateway?: {
    event?: {
      requestContext?: {
        authorizer?: Partial<{
          principalId: string
          provider_id: UUID
          scope: string
          email: string
        }>
      }
    }
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
