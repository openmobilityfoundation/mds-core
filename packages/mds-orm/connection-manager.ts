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
