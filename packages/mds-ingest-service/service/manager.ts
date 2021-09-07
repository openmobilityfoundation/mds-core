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
import { IngestServiceDefinition } from '../@types'
import { IngestServiceClient } from '../client'
import { IngestServiceProvider } from './provider'

export const IngestServiceManager = RpcServer(
  IngestServiceDefinition,
  {
    onStart: IngestServiceProvider.start,
    onStop: IngestServiceProvider.stop
  },
  {
    getDevicesUsingOptions: args => IngestServiceProvider.getDevicesUsingOptions(...args),
    getDevicesUsingCursor: args => IngestServiceProvider.getDevicesUsingCursor(...args),
    getEventsUsingOptions: args => IngestServiceProvider.getEventsUsingOptions(...args),
    getEventsUsingCursor: args => IngestServiceProvider.getEventsUsingCursor(...args),
    getDevices: args => IngestServiceProvider.getDevices(...args),
    getLatestTelemetryForDevices: args => IngestServiceProvider.getLatestTelemetryForDevices(...args),
    writeEventAnnotations: args => IngestServiceProvider.writeEventAnnotations(...args),
    writeMigratedDevice: args => IngestServiceProvider.writeMigratedDevice(...args),
    writeMigratedVehicleEvent: args => IngestServiceProvider.writeMigratedVehicleEvent(...args),
    writeMigratedTelemetry: args => IngestServiceProvider.writeMigratedTelemetry(...args),
    getTripEvents: args => IngestServiceProvider.getTripEvents(...args)
  },
  {
    port: process.env.INGEST_SERVICE_RPC_PORT,
    repl: {
      port: process.env.INGEST_SERVICE_REPL_PORT,
      context: { client: IngestServiceClient }
    }
  }
)
