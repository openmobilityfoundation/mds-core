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

import { Connection, createConnections, ConnectionOptions } from 'typeorm'
import { types as PostgresTypes } from 'pg'
import { LoggerOptions } from 'typeorm/logger/LoggerOptions'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'
import { MdsNamingStrategy } from './naming-strategies'
import { RepositoryError } from './exceptions'

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

const connectionName = (prefix: string, mode: ConnectionMode) => `${prefix}-${mode}`

export type ConnectionManagerOptions = Partial<PostgresConnectionOptions>

export const ConnectionManager = (prefix: string, options: Omit<ConnectionManagerOptions, 'cli'> = {}) => {
  let connections: Connection[] | null = null

  const [ro, rw]: ConnectionOptions[] = ConnectionModes.map(mode => ({
    name: connectionName(prefix, mode),
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
    ...options
  }))

  const initialize = async () => {
    if (!connections) {
      try {
        connections = await createConnections([ro, rw])
      } catch (error) /* istanbul ignore next */ {
        throw RepositoryError.create(error)
      }
    }
  }

  const connect = async (mode: ConnectionMode) => {
    if (!connections) {
      /* istanbul ignore next */
      throw RepositoryError.create(Error('Connection manager not initialized'))
    }
    const connection = connections.find(c => c.name === connectionName(prefix, mode))
    if (!connection) {
      /* istanbul ignore next */
      throw RepositoryError.create(Error(`Connection ${connectionName(prefix, mode)} not found`))
    }
    if (!connection.isConnected) {
      try {
        await connection.connect()
      } catch (error) /* istanbul ignore next */ {
        throw RepositoryError.create(error)
      }
    }
    return connection
  }

  const shutdown = async () => {
    if (connections) {
      try {
        await Promise.all(
          connections.filter(connection => connection.isConnected).map(connection => connection.close())
        )
      } finally {
        connections = null
      }
    }
  }

  return {
    initialize,
    cli: (cli: Partial<ConnectionManagerOptions['cli']> = {}) => {
      // Make the "rw" connection the default for the TypeORM CLI by removing the connection name
      const { name, ...ormconfig } = rw
      return { ...ormconfig, cli }
    },
    connect,
    shutdown
  }
}
