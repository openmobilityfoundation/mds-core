/**
 * Copyright 2021 City of Los Angeles
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

import { RpcServiceDefinition, RpcRoute } from '@mds-core/mds-rpc-common'
import { UUID, Timestamp, VEHICLE_STATE, VEHICLE_EVENT } from '@mds-core/mds-types'

export interface MatchedVehicleInformation {
  device_id: UUID
  state: VEHICLE_STATE
  event_types: VEHICLE_EVENT[]
  timestamp: Timestamp
  /** A vehicle/event pair may match the *logical criteria* for multiple rules within a policy */
  rules_matched: UUID[]
  /** Only one rule can be *applied* to a vehicle/event pair in the context of compliance */
  rule_applied?: UUID
  speed?: number
  gps: {
    lat: number
    lng: number
  }
}

export interface ComplianceSnapshotDomainModel {
  compliance_as_of: Timestamp
  compliance_snapshot_id: UUID
  policy: {
    name: string
    policy_id: UUID
  }
  provider_id: UUID
  vehicles_found: MatchedVehicleInformation[]
  excess_vehicles_count: number
  total_violations: number
}

/**
 * A violation period starts with the first compliance snapshot that has a violation, and ends
 * with the first snapshot that has no violations. E.g. if A, B, C, D, and E are snapshots,
 * and A and E have no violations, the violation period contains B, C and D, and the end_time is
 * the compliance_as_of timestamp on E.
 */
export interface ComplianceViolationPeriodDomainModel {
  compliance_snapshot_ids: UUID[]
  start_time: Timestamp
  end_time: Timestamp | null
}

export interface ComplianceAggregateDomainModel {
  policy_id: UUID
  provider_id: UUID
  provider_name: string
  violation_periods: ComplianceViolationPeriodDomainModel[]
}

export interface ComplianceViolationPeriodEntityModel {
  provider_id: UUID
  policy_id: UUID
  start_time: Timestamp
  end_time: Timestamp
  real_end_time: Timestamp | null
  compliance_snapshot_ids: UUID[]
  sum_total_violations: number
}

export type GetComplianceSnapshotOptions =
  | {
      compliance_snapshot_id: UUID
    }
  | {
      provider_id: UUID
      policy_id: UUID
      compliance_as_of: Timestamp
    }

export type GetComplianceSnapshotsByTimeIntervalOptions = Partial<{
  start_time: Timestamp
  end_time: Timestamp
  policy_ids: UUID[]
  provider_ids: UUID[]
}>

export type GetComplianceViolationPeriodsOptions = {
  start_time: Timestamp
  provider_ids?: UUID[]
  policy_ids?: UUID[]
  end_time?: Timestamp
}

export interface ComplianceService {
  createComplianceSnapshots: (complianceSnapshots: ComplianceSnapshotDomainModel[]) => ComplianceSnapshotDomainModel[]
  createComplianceSnapshot: (complianceSnapshot: ComplianceSnapshotDomainModel) => ComplianceSnapshotDomainModel
  getComplianceSnapshotsByTimeInterval: (
    options: GetComplianceSnapshotsByTimeIntervalOptions
  ) => ComplianceSnapshotDomainModel[]
  getComplianceSnapshotsByIDs: (ids: UUID[]) => ComplianceSnapshotDomainModel[]
  getComplianceSnapshot: (options: GetComplianceSnapshotOptions) => ComplianceSnapshotDomainModel
  getComplianceViolationPeriods: (options: GetComplianceViolationPeriodsOptions) => ComplianceAggregateDomainModel[]
}

export const ComplianceServiceDefinition: RpcServiceDefinition<ComplianceService> = {
  createComplianceSnapshots: RpcRoute<ComplianceService['createComplianceSnapshots']>(),
  createComplianceSnapshot: RpcRoute<ComplianceService['createComplianceSnapshot']>(),
  getComplianceSnapshotsByTimeInterval: RpcRoute<ComplianceService['getComplianceSnapshotsByTimeInterval']>(),
  getComplianceSnapshotsByIDs: RpcRoute<ComplianceService['getComplianceSnapshotsByIDs']>(),
  getComplianceSnapshot: RpcRoute<ComplianceService['getComplianceSnapshot']>(),
  getComplianceViolationPeriods: RpcRoute<ComplianceService['getComplianceViolationPeriods']>()
}
