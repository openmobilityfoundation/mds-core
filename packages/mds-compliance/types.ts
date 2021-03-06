import { MatchedVehicle, VehicleEvent, UUID, Timestamp, ComplianceResponse, Policy } from '@mds-core/mds-types'
import { ApiRequest, ApiClaims, ApiVersionedResponse } from '@mds-core/mds-api-server'

export const COMPLIANCE_API_SUPPORTED_VERSIONS = ['0.1.0'] as const
export type COMPLIANCE_API_SUPPORTED_VERSION = typeof COMPLIANCE_API_SUPPORTED_VERSIONS[number]
export const [COMPLIANCE_API_DEFAULT_VERSION] = COMPLIANCE_API_SUPPORTED_VERSIONS

export type ComplianceApiRequest = ApiRequest

export type ComplianceApiAccessTokenScopes = never

export type ComplianceApiResponse<TBody = {}> = ApiVersionedResponse<
  COMPLIANCE_API_SUPPORTED_VERSION,
  ApiClaims<ComplianceApiAccessTokenScopes> & {
    provider_id: UUID
  },
  TBody
>

type ComplianceSnapshotResponse = ComplianceResponse & { timestamp: Timestamp }

export type ComplianceSnapshotApiResponse = ComplianceApiResponse<ComplianceSnapshotResponse>
export type ComplianceCountApiResponse = ComplianceApiResponse<{
  policy: Policy
  count: number
  timestamp: Timestamp
}>

export type MatchedVehiclePlusRule = MatchedVehicle & { rule_id: UUID }

export type VehicleEventWithTelemetry = VehicleEvent & { telemetry: { gps: { lat: number; lng: number } } }
