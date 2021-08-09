/**
 * Copyright 2020 City of Los Angeles
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
import { PolicyServiceDefinition } from '../@types'
import { PolicyServiceClient } from '../client'
import { PolicyServiceProvider } from './provider'

export const PolicyServiceManager = RpcServer(
  PolicyServiceDefinition,
  {
    onStart: PolicyServiceProvider.start,
    onStop: PolicyServiceProvider.stop
  },
  {
    name: args => PolicyServiceProvider.name(...args),
    writePolicy: args => PolicyServiceProvider.writePolicy(...args),
    readPolicies: args => PolicyServiceProvider.readPolicies(...args),
    readActivePolicies: args => PolicyServiceProvider.readActivePolicies(...args),
    deletePolicy: args => PolicyServiceProvider.deletePolicy(...args),
    editPolicy: args => PolicyServiceProvider.editPolicy(...args),
    publishPolicy: args => PolicyServiceProvider.publishPolicy(...args),
    readBulkPolicyMetadata: args => PolicyServiceProvider.readBulkPolicyMetadata(...args),
    readPolicy: args => PolicyServiceProvider.readPolicy(...args),
    readSinglePolicyMetadata: args => PolicyServiceProvider.readSinglePolicyMetadata(...args),
    updatePolicyMetadata: args => PolicyServiceProvider.updatePolicyMetadata(...args),
    writePolicyMetadata: args => PolicyServiceProvider.writePolicyMetadata(...args)
  },
  {
    port: process.env.POLICY_SERVICE_RPC_PORT,
    repl: {
      port: process.env.POLICY_SERVICE_REPL_PORT,
      context: { client: PolicyServiceClient }
    }
  }
)
