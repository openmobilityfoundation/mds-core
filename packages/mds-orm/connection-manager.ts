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

import { Connection, createConnections, getConnectionManager, ConnectionOptions } from 'typeorm'
import { ServerError } from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'
import { ConnectionName, Connections } from './connections'

let connections: Connection[] | null = null

export const ConnectionManager = (options: ConnectionOptions[] = Connections()) => {
  const initialize = async () => {
    if (!connections) {
      try {
        connections = await createConnections(options)
      } catch (error) {
        logger.error('Database Initialization Error', error)
        throw new ServerError('Database Initialization Error')
      }
    }
  }

  const getNamedConnection = async (name: ConnectionName) => {
    await initialize()
    try {
      const connection = getConnectionManager().get(name)
      if (!connection.isConnected) {
        await connection.connect()
      }
      return connection
    } catch (error) {
      logger.error('Database Connection Error', error)
      throw new ServerError('Database Connection Error')
    }
  }

  const getReadOnlyConnection = async () => getNamedConnection('ro')

  const getReadWriteConnection = async () => getNamedConnection('rw')

  const shutdown = async () => {
    if (connections) {
      await Promise.all(connections.filter(connection => connection.isConnected).map(connection => connection.close()))
    }
    connections = null
  }

  return {
    initialize,
    getReadOnlyConnection,
    getReadWriteConnection,
    shutdown
  }
}
