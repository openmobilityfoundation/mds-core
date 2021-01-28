/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { VehicleEvent, UUID, Timestamp, Policy, Device, Rule } from '@mds-core/mds-types'
import {
  ApiRequest,
  ApiVersionedResponse,
  ApiResponseLocals,
  ApiRequestParams,
  ApiResponseLocalsClaims
} from '@mds-core/mds-api-server'

export const COMPLIANCE_API_SUPPORTED_VERSIONS = ['0.1.0'] as const
export type COMPLIANCE_API_SUPPORTED_VERSION = typeof COMPLIANCE_API_SUPPORTED_VERSIONS[number]
export const [COMPLIANCE_API_DEFAULT_VERSION] = COMPLIANCE_API_SUPPORTED_VERSIONS

export type ComplianceApiRequest<B = {}> = ApiRequest<B>

export type ComplianceApiSnapshotRequest = ComplianceApiRequest & ApiRequestParams<'policy_uuid'>
export type ComplianceApiCountRequest = ComplianceApiRequest & ApiRequestParams<'rule_id'>

export type ComplianceApiAccessTokenScopes = never

export type ComplianceApiResponse<B = {}> = ApiVersionedResponse<COMPLIANCE_API_SUPPORTED_VERSION, B> &
  ApiResponseLocalsClaims<ComplianceApiAccessTokenScopes> &
  ApiResponseLocals<'provider_id', UUID>

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
