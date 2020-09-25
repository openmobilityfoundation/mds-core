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

import express from 'express'
import http from 'http'
import net from 'net'
import REPL from 'repl'
import { ServiceHandlerFor } from 'rpc_ts/lib/server/server'
import { cleanEnv, port as validatePort } from 'envalid'
import { ModuleRpcProtocolServer } from 'rpc_ts/lib/protocol/server'
import logger from '@mds-core/mds-logger'
import {
  HttpServer,
  HealthRequestHandler,
  PrometheusMiddleware,
  RequestLoggingMiddleware,
  RawBodyParserMiddlewareOptions,
  RawBodyParserMiddleware
} from '@mds-core/mds-api-server'
import { Nullable } from '@mds-core/mds-types'
import { ProcessManager } from '@mds-core/mds-service-helpers'
import { RpcServiceDefinition, RPC_PORT, RPC_CONTENT_TYPE, REPL_PORT } from '../@types'

export interface RpcServiceHandlers {
  onStart: () => Promise<void>
  onStop: () => Promise<void>
}

export interface RpcServerOptions {
  port: string | number
  repl: Partial<{
    port: string
    context: unknown
  }>
  maxRequestSize: RawBodyParserMiddlewareOptions['limit']
}

const stopServer = async (server: http.Server | net.Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })

const startRepl = (options: RpcServerOptions['repl']): Promise<net.Server> =>
  new Promise(resolve => {
    const env = {
      port: cleanEnv(process.env, { REPL_PORT: validatePort({ default: REPL_PORT }) }).REPL_PORT,
      context: {},
      ...options
    }
    logger.info(`Starting REPL server on port ${env.port}`)
    const server = net
      .createServer(socket => {
        const repl = REPL.start({
          prompt: `${process.env.npm_package_name} REPL> `,
          input: socket,
          output: socket,
          ignoreUndefined: true,
          terminal: true
        })
        Object.assign(repl.context, env.context)
        repl.on('reset', () => {
          Object.assign(repl.context, env.context)
        })
      })
      .on('close', () => {
        logger.info(`Stopping REPL server`)
      })
    server.listen(env.port, () => {
      resolve(server)
    })
  })

export const RpcServer = <S>(
  definition: RpcServiceDefinition<S>,
  { onStart, onStop }: RpcServiceHandlers,
  routes: ServiceHandlerFor<RpcServiceDefinition<S>>,
  options: Partial<RpcServerOptions> = {}
) => {
  let server: Nullable<http.Server> = null
  let repl: Nullable<net.Server> = null

  return ProcessManager({
    start: async () => {
      if (!server) {
        const env = {
          port: cleanEnv(process.env, { RPC_PORT: validatePort({ default: RPC_PORT }) }).RPC_PORT,
          ...options
        }
        logger.info(`Starting RPC server listening for ${RPC_CONTENT_TYPE} requests on port ${env.port}`)
        await onStart()
        server = HttpServer(
          express()
            .use(PrometheusMiddleware())
            .use(RequestLoggingMiddleware())
            .use(RawBodyParserMiddleware({ type: RPC_CONTENT_TYPE, limit: env.maxRequestSize }))
            .get('/health', HealthRequestHandler)
            .use(ModuleRpcProtocolServer.registerRpcRoutes(definition, routes)),
          { port: env.port }
        )
        if (env.repl) {
          repl = await startRepl(env.repl)
        }
      }
    },
    stop: async () => {
      if (server) {
        await stopServer(server)
        server = null
        if (repl) {
          await stopServer(repl)
          repl = null
        }
        logger.info(`Stopping RPC server listening for ${RPC_CONTENT_TYPE} requests`)
        await onStop()
      }
    }
  })
}
