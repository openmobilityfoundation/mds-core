/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { ServiceClient } from '@mds-core/mds-service-helpers'
import { RpcClient, RpcRequest } from '@mds-core/mds-rpc-common'
import { JurisdictionServiceDefinition, JurisdictionService } from '../@types'

const JurisdictionServiceRpcClient = RpcClient(JurisdictionServiceDefinition, {
  host: process.env.JURISDICTION_SERVICE_RPC_HOST,
  port: process.env.JURISDICTION_SERVICE_RPC_PORT
})

export const JurisdictionServiceClient: ServiceClient<JurisdictionService> = {
  createJurisdiction: (...args) => RpcRequest(JurisdictionServiceRpcClient.createJurisdiction, args),
  createJurisdictions: (...args) => RpcRequest(JurisdictionServiceRpcClient.createJurisdictions, args),
  deleteJurisdiction: (...args) => RpcRequest(JurisdictionServiceRpcClient.deleteJurisdiction, args),
  getJurisdiction: (...args) => RpcRequest(JurisdictionServiceRpcClient.getJurisdiction, args),
  getJurisdictions: (...args) => RpcRequest(JurisdictionServiceRpcClient.getJurisdictions, args),
  updateJurisdiction: (...args) => RpcRequest(JurisdictionServiceRpcClient.updateJurisdiction, args)
}
