import { VehicleEvent, UUID, Timestamp, Policy, Device, Rule } from '@mds-core/mds-types'
import {
  ApiRequest,
  ApiClaims,
  ApiVersionedResponse,
  ApiResponseLocals,
  ApiRequestParams
} from '@mds-core/mds-api-server'

export const COMPLIANCE_API_SUPPORTED_VERSIONS = ['0.1.0'] as const
export type COMPLIANCE_API_SUPPORTED_VERSION = typeof COMPLIANCE_API_SUPPORTED_VERSIONS[number]
export const [COMPLIANCE_API_DEFAULT_VERSION] = COMPLIANCE_API_SUPPORTED_VERSIONS

export type ComplianceApiRequest<B = {}> = ApiRequest<B>

export type ComplianceApiSnapshotRequest = ComplianceApiRequest & ApiRequestParams<'policy_uuid'>
export type ComplianceApiCountRequest = ComplianceApiRequest & ApiRequestParams<'rule_id'>

export type ComplianceApiAccessTokenScopes = never

export type ComplianceApiResponse<B = {}> = ApiVersionedResponse<COMPLIANCE_API_SUPPORTED_VERSION, B> &
  ApiResponseLocals<ApiClaims<ComplianceApiAccessTokenScopes>> &
  ApiResponseLocals<{ provider_id: UUID }>

export type ComplianceApiSnapshotResponse = ComplianceApiResponse<ComplianceResponse & { timestamp: Timestamp }>
export type ComplianceApiCountResponse = ComplianceApiResponse<{
  policy: Policy
  count: number
  timestamp: Timestamp
}>

export type MatchedVehiclePlusRule = MatchedVehicle & { rule_id: UUID }

export type VehicleEventWithTelemetry = VehicleEvent & { telemetry: { gps: { lat: number; lng: number } } }
export interface MatchedVehicle {
  device: Device
  event: VehicleEvent
}

export interface CountMatch {
  measured: number
  geography_id: UUID
  matched_vehicles: MatchedVehicle[]
}

export interface TimeMatch {
  measured: number
  geography_id: UUID
  matched_vehicle: MatchedVehicle
}

export interface SpeedMatch {
  measured: number
  geography_id: UUID
  matched_vehicle: MatchedVehicle
}

export interface ReducedMatch {
  measured: number
  geography_id: UUID
}

export interface Compliance {
  rule: Rule
  matches: ReducedMatch[] | CountMatch[] | TimeMatch[] | SpeedMatch[]
}
export interface ComplianceResponse {
  policy: Policy
  compliance: Compliance[]
  total_violations: number
  vehicles_in_violation: MatchedVehiclePlusRule[]
}
