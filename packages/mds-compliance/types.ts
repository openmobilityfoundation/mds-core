import { MatchedVehicle, VehicleEvent, UUID } from '@mds-core/mds-types'
import { ApiRequest, ApiResponse, ApiClaims } from '@mds-core/mds-api-server'

export type ComplianceApiRequest = ApiRequest

export type ComplianceApiAccessTokenScopes = never

export type ComplianceApiResponse = ApiResponse<
  ApiClaims<ComplianceApiAccessTokenScopes> & {
    provider_id: UUID
  }
>

export type MatchedVehiclePlusRule = MatchedVehicle & { rule_id: UUID }

export type VehicleEventWithTelemetry = VehicleEvent & { telemetry: { gps: { lat: number; lng: number } } }
