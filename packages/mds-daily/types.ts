import express from 'express'
import { UUID, CountMap } from 'mds'
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

export interface TripsStats {
  single: number
  singles?: CountMap<{}> // FIXME
  mysteries?: CountMap<{}> // FIXME
  mystery_examples?: CountMap<{}> // FIXME
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

// interface TelemetryMap = { [s: string]: Telemetry[] }
