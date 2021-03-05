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
import { CollectorServiceProvider } from './provider'
import { CollectorServiceClient } from '../client'
import { CollectorServiceRpcDefinition } from '../@types'

export const { monitor: CollectorBackend, controller: CollectorBackendController } = RpcServer(
  CollectorServiceRpcDefinition,
  {
    onStart: CollectorServiceProvider.start,
    onStop: CollectorServiceProvider.stop
  },
  {
    registerMessageSchema: args => CollectorServiceProvider.registerMessageSchema(...args),
    getMessageSchema: args => CollectorServiceProvider.getMessageSchema(...args),
    writeSchemaMessages: args => CollectorServiceProvider.writeSchemaMessages(...args)
  },
  {
    port: process.env.COLLECTOR_BACKEND_RPC_PORT,
    repl: {
      port: process.env.COLLECTOR_BACKEND_REPL_PORT,
      context: { client: CollectorServiceClient }
    }
  }
)
