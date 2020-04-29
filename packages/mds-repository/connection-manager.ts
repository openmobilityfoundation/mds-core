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

import { Connection, ConnectionOptions, createConnection } from 'typeorm'
import { types as PostgresTypes } from 'pg'
import { LoggerOptions } from 'typeorm/logger/LoggerOptions'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'
import { Nullable, UUID } from '@mds-core/mds-types'
import { uuid } from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'
import AwaitLock from 'await-lock'
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

export type ConnectionManagerOptions = Partial<PostgresConnectionOptions>

export const ConnectionManager = (prefix: string, options: Omit<ConnectionManagerOptions, 'cli'> = {}) => {
  const lock = new AwaitLock()
  const connections: { [mode in ConnectionMode]: Nullable<Connection> } = { ro: null, rw: null }

  const connectionName = ((instance: UUID) => (mode: ConnectionMode) => `${prefix}-${mode}-${instance}`)(uuid())

  const connectionOptions = (mode: ConnectionMode): ConnectionOptions => ({
    name: connectionName(mode),
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
    migrationsRun: false,
    namingStrategy: new MdsNamingStrategy(),
    ...options
  })

  const getConnection = async (mode: ConnectionMode) => {
    await lock.acquireAsync()
    try {
      if (!connections[mode]) {
        connections[mode] = await createConnection(connectionOptions(mode))
        logger.info(`Created ${mode} connection: ${connections[mode]?.options.name}`)
      }
    } finally {
      lock.release()
    }
    return connections[mode]
  }

  const connect = async (mode: ConnectionMode) => {
    const connection = await getConnection(mode)
    if (!connection) {
      /* istanbul ignore next */
      throw RepositoryError(Error(`Connection ${connectionName(mode)} not found`))
    }
    if (!connection.isConnected) {
      try {
        await connection.connect()
      } catch (error) /* istanbul ignore next */ {
        throw RepositoryError(error)
      }
    }
    return connection
  }

  const initialize = async () => {
    try {
      const [, rw] = await Promise.all(ConnectionModes.map(mode => connect(mode)))
      /* istanbul ignore if */
      if (PG_MIGRATIONS === 'true' && rw.options.migrationsTableName) {
        const migrations = await rw.runMigrations({ transaction: 'all' })
        logger.info(
          `Ran ${migrations.length} ${migrations.length === 1 ? 'migration' : 'migrations'} (${
            options.migrationsTableName
          })${migrations.length ? `: ${migrations.map(migration => migration.name).join(', ')}` : ''}`
        )
      }
    } catch (error) /* istanbul ignore next */ {
      throw RepositoryError(error)
    }
  }

  const shutdown = async () => {
    try {
      if (connections.ro?.isConnected) {
        await connections.ro.close()
      }
      if (connections.rw?.isConnected) {
        await connections.rw.close()
      }
    } finally {
      connections.ro = null
      connections.rw = null
    }
  }

  return {
    initialize,
    cli: (cli: Partial<ConnectionManagerOptions['cli']> = {}) => {
      // Make the "rw" connection the default for the TypeORM CLI by removing the connection name
      const { name, ...ormconfig } = connectionOptions('rw')
      return { ...ormconfig, cli }
    },
    connect,
    shutdown
  }
}
