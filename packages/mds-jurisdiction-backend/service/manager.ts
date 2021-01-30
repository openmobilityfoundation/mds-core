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

import { RpcServer } from '@mds-core/mds-rpc-common'
import { JurisdictionServiceProvider } from './provider'
import { JurisdictionServiceClient } from '../client'
import { JurisdictionServiceDefinition } from '../@types'

export const JurisdictionServiceManager = RpcServer(
  JurisdictionServiceDefinition,
  {
    onStart: JurisdictionServiceProvider.start,
    onStop: JurisdictionServiceProvider.stop
  },
  {
    createJurisdiction: args => JurisdictionServiceProvider.createJurisdiction(...args),
    createJurisdictions: args => JurisdictionServiceProvider.createJurisdictions(...args),
    deleteJurisdiction: args => JurisdictionServiceProvider.deleteJurisdiction(...args),
    getJurisdiction: args => JurisdictionServiceProvider.getJurisdiction(...args),
    getJurisdictions: args => JurisdictionServiceProvider.getJurisdictions(...args),
    updateJurisdiction: args => JurisdictionServiceProvider.updateJurisdiction(...args)
  },
  {
    port: process.env.JURISDICTION_SERVICE_RPC_PORT,
    repl: {
      port: process.env.JURISDICTION_SERVICE_REPL_PORT,
      context: { client: JurisdictionServiceClient }
    }
  }
)
