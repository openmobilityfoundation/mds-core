import { MatchedVehicle, VehicleEvent, UUID } from '@mds-core/mds-types'
import { ApiRequest, ApiResponse, ApiResponseLocals } from '@mds-core/mds-api-server'

export type ComplianceApiRequest = ApiRequest
export interface ComplianceApiResponse extends ApiResponse {
  locals: ApiResponseLocals & {
    provider_id: UUID
  }
}

export type MatchedVehiclePlusRule = MatchedVehicle & { rule_id: UUID }

export type VehicleEventWithTelemetry = VehicleEvent & { telemetry: { gps: { lat: number; lng: number } } }
