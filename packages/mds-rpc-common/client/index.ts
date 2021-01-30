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

import { ModuleRpcProtocolClient } from 'rpc_ts/lib/protocol/client'
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport'
import { ClientRpcError } from 'rpc_ts/lib/client/errors'
import { ServiceError, ServiceResponse } from '@mds-core/mds-backend-helpers'
import { AnyFunction } from '@mds-core/mds-types'
import { RpcServiceDefinition, RPC_HOST, RPC_PORT } from '../@types'

export interface RpcClientOptions {
  host: string
  port: string | number
}

export const RpcClient = <S>(definition: RpcServiceDefinition<S>, options: Partial<RpcClientOptions> = {}) => {
  const host = options.host || process.env.RPC_HOST || RPC_HOST
  const port = Number(options.port || process.env.RPC_PORT || RPC_PORT)

  return ModuleRpcProtocolClient.getRpcClient(definition, {
    getGrpcWebTransport: NodeHttpTransport(),
    remoteAddress: `${host}:${port}`
  })
}

const RpcClientError = (error: {}) =>
  ServiceError({
    type: 'ServiceUnavailable',
    message: error instanceof Error ? error.message : error.toString(),
    details: error instanceof ClientRpcError ? error.errorType : undefined
  }).error

// eslint-reason type inference requires any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RpcMethod<R = any> = AnyFunction<Promise<ServiceResponse<R>>>
type RpcRequestType<M extends RpcMethod> = Parameters<M>
type RpcResponseType<M extends RpcMethod> = ReturnType<M> extends Promise<ServiceResponse<infer R>> ? R : never

const RpcResponse = async <M extends RpcMethod>(
  request: M,
  ...args: RpcRequestType<M>
): Promise<ServiceResponse<RpcResponseType<M>>> => {
  try {
    const response = await request(...args)
    return response
  } catch (error) {
    throw RpcClientError(error)
  }
}

export const RpcRequest = async <M extends RpcMethod>(
  request: M,
  ...args: RpcRequestType<M>
): Promise<RpcResponseType<M>> => {
  const response = await RpcResponse(request, ...args)
  if (response.error) {
    throw response.error
  }
  return response.result
}
