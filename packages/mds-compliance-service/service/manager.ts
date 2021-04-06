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

import { RpcServer } from '@mds-core/mds-rpc-common'
import { ComplianceServiceDefinition } from '../@types'
import { ComplianceServiceClient } from '../client'
import { ComplianceServiceProvider } from './provider'

export const ComplianceServiceManager = RpcServer(
  ComplianceServiceDefinition,
  {
    onStart: ComplianceServiceProvider.start,
    onStop: ComplianceServiceProvider.stop
  },
  {
    createComplianceSnapshot: args => ComplianceServiceProvider.createComplianceSnapshot(...args),
    createComplianceSnapshots: args => ComplianceServiceProvider.createComplianceSnapshots(...args),
    getComplianceSnapshot: args => ComplianceServiceProvider.getComplianceSnapshot(...args),
    getComplianceSnapshotsByTimeInterval: args =>
      ComplianceServiceProvider.getComplianceSnapshotsByTimeInterval(...args),
    getComplianceSnapshotsByIDs: args => ComplianceServiceProvider.getComplianceSnapshotsByIDs(...args),
    getComplianceViolationPeriods: args => ComplianceServiceProvider.getComplianceViolationPeriods(...args)
  },
  {
    port: process.env.COMPLIANCE_SERVICE_RPC_PORT,
    repl: {
      port: process.env.COMPLIANCE_SERVICE_REPL_PORT,
      context: { client: ComplianceServiceClient }
    }
  }
)
