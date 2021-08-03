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
import { GeographyServiceDefinition } from '../@types'
import { GeographyServiceClient } from '../client'
import { GeographyServiceProvider } from './provider'

export const GeographyServiceManager = RpcServer(
  GeographyServiceDefinition,
  {
    onStart: GeographyServiceProvider.start,
    onStop: GeographyServiceProvider.stop
  },
  {
    getGeography: args => GeographyServiceProvider.getGeography(...args),
    getGeographies: args => GeographyServiceProvider.getGeographies(...args),
    getUnpublishedGeographies: args => GeographyServiceProvider.getUnpublishedGeographies(...args),
    getPublishedGeographies: args => GeographyServiceProvider.getPublishedGeographies(...args),
    writeGeographies: args => GeographyServiceProvider.writeGeographies(...args),
    writeGeographiesMetadata: args => GeographyServiceProvider.writeGeographiesMetadata(...args),
    getGeographiesByIds: args => GeographyServiceProvider.getGeographiesByIds(...args)
  },
  {
    port: process.env.GEOGRAPHY_SERVICE_RPC_PORT,
    repl: {
      port: process.env.GEOGRAPHY_SERVICE_REPL_PORT,
      context: { client: GeographyServiceClient }
    }
  }
)
