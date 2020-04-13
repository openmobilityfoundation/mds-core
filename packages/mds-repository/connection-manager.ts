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
import { types as PostgresTypes } from 'pg'
import { LoggerOptions } from 'typeorm/logger/LoggerOptions'

import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'
import { MdsNamingStrategy } from './naming-strategies'

const loggingOption = (options: string): LoggerOptions => {
  return ['false', 'true', 'all'].includes(options) ? options !== 'false' : (options.split(' ') as LoggerOptions)
}

const ConnectionModes = ['ro', 'rw'] as const
export type ConnectionMode = typeof ConnectionModes[number]

// Use parseInt for bigint columns so the values get returned as numbers instead of strings
PostgresTypes.setTypeParser(20, Number)

const {
  PG_HOST,
  PG_HOST_READER,
  PG_PORT,
  PG_USER,
  PG_PASS,
  PG_NAME,
  PG_DEBUG = 'false',
  PG_MIGRATIONS = 'true' // Enable migrations by default
} = process.env

const connectionName = (name: string, mode: ConnectionMode) => `${name}-${mode}`

export type ConnectionManagerOptions = Partial<PostgresConnectionOptions>

export const ConnectionManager = (name: string, options: ConnectionManagerOptions = {}) => {
  let connections: Connection[] | null = null

  const config: ConnectionOptions[] = ConnectionModes.map(mode => ({
    name: connectionName(name, mode),
    type: 'postgres',
    host: (mode === 'rw' ? PG_HOST : PG_HOST_READER) || PG_HOST || 'localhost',
    port: Number(PG_PORT) || 5432,
    username: PG_USER,
    password: PG_PASS,
    database: PG_NAME,
    logging: loggingOption(PG_DEBUG.toLowerCase()),
    maxQueryExecutionTime: 3000,
    logger: 'simple-console',
    synchronize: false,
    migrationsRun: PG_MIGRATIONS === 'true' && mode === 'rw',
    namingStrategy: new MdsNamingStrategy(),
    cli: {
      entitiesDir: './entities',
      migrationsDir: './migrations'
    },
    ...options
  }))

  const initialize = async () => {
    if (!connections) {
      try {
        connections = await createConnections(config)
      } catch (error) {
        logger.error('Database Initialization Error', error)
        throw new ServerError('Database Initialization Error')
      }
    }
  }

  const connect = async (mode: ConnectionMode) => {
    await initialize()
    try {
      const connection =
        connections?.find(c => c.name === connectionName(name, mode)) ??
        getConnectionManager().get(connectionName(name, mode))
      if (!connection.isConnected) {
        await connection.connect()
      }
      return connection
    } catch (error) {
      logger.error('Database Connection Error', error)
      throw new ServerError('Database Connection Error')
    }
  }

  const shutdown = async () => {
    if (connections) {
      await Promise.all(connections.filter(connection => connection.isConnected).map(connection => connection.close()))
    }
    connections = null
  }

  return {
    initialize,
    config,
    connect,
    shutdown
  }
}
