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

import { RpcClient, RpcRequest } from '@mds-core/mds-rpc-common'
import { ServiceClient } from '@mds-core/mds-service-helpers'
import { IngestMigrationService, IngestService, IngestServiceDefinition } from '../@types'

const IngestServiceRpcClient = RpcClient(IngestServiceDefinition, {
  host: process.env.INGEST_SERVICE_RPC_HOST,
  port: process.env.INGEST_SERVICE_RPC_PORT
})

// What the API layer, and any other clients, will invoke.
export const IngestServiceClient: ServiceClient<IngestService & IngestMigrationService> = {
  getEventsUsingOptions: (...args) => RpcRequest(IngestServiceRpcClient.getEventsUsingOptions, args),
  getEventsUsingCursor: (...args) => RpcRequest(IngestServiceRpcClient.getEventsUsingCursor, args),
  getDevices: (...args) => RpcRequest(IngestServiceRpcClient.getDevices, args),
  writeEventAnnotations: (...args) => RpcRequest(IngestServiceRpcClient.writeEventAnnotations, args),
  writeMigratedDevice: (...args) => RpcRequest(IngestServiceRpcClient.writeMigratedDevice, args),
  writeMigratedVehicleEvent: (...args) => RpcRequest(IngestServiceRpcClient.writeMigratedVehicleEvent, args),
  writeMigratedTelemetry: (...args) => RpcRequest(IngestServiceRpcClient.writeMigratedTelemetry, args)
}
