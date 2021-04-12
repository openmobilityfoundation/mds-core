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

import { ServiceClient } from '@mds-core/mds-service-helpers'
import { RpcClient, RpcRequest } from '@mds-core/mds-rpc-common'
import { ComplianceService, ComplianceServiceDefinition } from '../@types'

const ComplianceServiceRpcClient = RpcClient(ComplianceServiceDefinition, {
  host: process.env.COMPLIANCE_SERVICE_RPC_HOST,
  port: process.env.COMPLIANCE_SERVICE_RPC_PORT
})

// What the API layer, and any other clients, will invoke.
export const ComplianceServiceClient: ServiceClient<ComplianceService> = {
  getComplianceSnapshot: (...args) => RpcRequest(ComplianceServiceRpcClient.getComplianceSnapshot, args),
  getComplianceSnapshotsByTimeInterval: (...args) =>
    RpcRequest(ComplianceServiceRpcClient.getComplianceSnapshotsByTimeInterval, args),
  getComplianceSnapshotsByIDs: (...args) => RpcRequest(ComplianceServiceRpcClient.getComplianceSnapshotsByIDs, args),
  createComplianceSnapshot: (...args) => RpcRequest(ComplianceServiceRpcClient.createComplianceSnapshot, args),
  createComplianceSnapshots: (...args) => RpcRequest(ComplianceServiceRpcClient.createComplianceSnapshots, args),
  getComplianceViolationPeriods: (...args) => RpcRequest(ComplianceServiceRpcClient.getComplianceViolationPeriods, args)
}
