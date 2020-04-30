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
import { uuid, pluralize } from '@mds-core/mds-utils'
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

export type ConnectionManagerOptions = Partial<Omit<PostgresConnectionOptions, 'cli'>>
export type ConnectionManagerCliOptions = Partial<PostgresConnectionOptions['cli']>

export class ConnectionManager {
  private readonly connections: { [mode in ConnectionMode]: Nullable<Connection> } = { ro: null, rw: null }

  private readonly lock = new AwaitLock()

  private readonly instance: UUID = uuid()

  private connectionName = (mode: ConnectionMode): string => {
    const { prefix, instance } = this
    return `${prefix}-${mode}-${instance}`
  }

  private connectionOptions = (mode: ConnectionMode): ConnectionOptions => {
    const { connectionName, options } = this
    const { PG_HOST, PG_HOST_READER, PG_PORT, PG_USER, PG_PASS, PG_NAME, PG_DEBUG = 'false' } = process.env

    return {
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
    }
  }

  private getConnection = async (mode: ConnectionMode): Promise<Nullable<Connection>> => {
    const { lock, connections, connectionOptions } = this
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

  public initialize = async (): Promise<void> => {
    const { connect, options } = this
    const {
      PG_MIGRATIONS = 'true' // Enable migrations by default
    } = process.env

    try {
      const [, rw] = await Promise.all(ConnectionModes.map(mode => connect(mode)))
      /* istanbul ignore if */
      if (PG_MIGRATIONS === 'true' && rw.options.migrationsTableName) {
        const migrations = await rw.runMigrations({ transaction: 'all' })
        logger.info(
          `Ran ${migrations.length} ${pluralize(migrations.length, 'migration', 'migrations')} (${
            options.migrationsTableName
          })${migrations.length ? `: ${migrations.map(migration => migration.name).join(', ')}` : ''}`
        )
      }
    } catch (error) /* istanbul ignore next */ {
      throw RepositoryError(error)
    }
  }

  public connect = async (mode: ConnectionMode): Promise<Connection> => {
    const { getConnection, connectionName } = this
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

  public shutdown = async (): Promise<void> => {
    const { connections } = this
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

  public cli = (options: ConnectionManagerCliOptions = {}) => {
    const { connectionOptions } = this
    // Make the "rw" connection the default for the TypeORM CLI by removing the connection name
    const { name, ...ormconfig } = connectionOptions('rw')
    return { ...ormconfig, options }
  }

  constructor(private prefix: string, private options: ConnectionManagerOptions = {}) {}
}
