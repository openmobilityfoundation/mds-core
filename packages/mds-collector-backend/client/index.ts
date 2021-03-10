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
import {
  CollectorServiceRpcDefinition,
  CollectorService,
  CollectorSchemaDomainModel,
  CollectorMessageDomainModel
} from '../@types'

const CollectorServiceRpcClient = RpcClient(CollectorServiceRpcDefinition, {
  host: process.env.COLLECTOR_BACKEND_RPC_HOST,
  port: process.env.COLLECTOR_BACKEND_RPC_PORT
})

export const CollectorServiceClient: ServiceClient<CollectorService> = {
  registerMessageSchema: (...args) => RpcRequest(CollectorServiceRpcClient.registerMessageSchema, args),
  getMessageSchema: (...args) => RpcRequest(CollectorServiceRpcClient.getMessageSchema, args),
  writeSchemaMessages: (...args) => RpcRequest(CollectorServiceRpcClient.writeSchemaMessages, args)
}

export const CollectorServiceClientFactory = (
  schema_id: CollectorSchemaDomainModel['schema_id'],
  schema: CollectorSchemaDomainModel['schema']
) => {
  return {
    registerMessageSchema: async () => CollectorServiceClient.registerMessageSchema(schema_id, schema),
    getMessageSchema: async () => CollectorServiceClient.getMessageSchema(schema_id),
    writeSchemaMessages: async (
      provider_id: CollectorMessageDomainModel['provider_id'],
      messages: Array<CollectorMessageDomainModel['message']>
    ) => CollectorServiceClient.writeSchemaMessages(schema_id, provider_id, messages)
  }
}

export type CollectorServiceClient = ReturnType<typeof CollectorServiceClientFactory>
