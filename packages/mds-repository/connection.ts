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

export type ConnectionManagerOptions = Partial<Omit<PostgresConnectionOptions, 'cli'>>
export type ConnectionManagerCliOptions = Partial<PostgresConnectionOptions['cli']>

export class ConnectionManager<TConnectionMode extends ConnectionMode> {
  private readonly connections: Map<TConnectionMode, Nullable<Connection>> = new Map()

  private readonly lock = new AwaitLock()

  private readonly instance: UUID = uuid()

  private connectionName = (mode: TConnectionMode): string => {
    const { prefix, instance } = this
    return `${prefix}-${mode}-${instance}`
  }

  private connectionMode = (mode: TConnectionMode): string => (mode === 'ro' ? 'R/O' : 'R/W')

  private connectionOptions = (mode: TConnectionMode): ConnectionOptions => {
    const { connectionName, options } = this
    const {
      PG_DEBUG = 'false',
      PG_HOST,
      PG_HOST_READER,
      PG_NAME,
      PG_PASS,
      PG_PASS_READER,
      PG_PORT,
      PG_USER,
      PG_USER_READER
    } = process.env

    return {
      name: connectionName(mode),
      type: 'postgres',
      host: (mode === 'rw' ? PG_HOST : PG_HOST_READER) || PG_HOST || 'localhost',
      port: Number(PG_PORT) || 5432,
      username: (mode === 'rw' ? PG_USER : PG_USER_READER) || PG_USER,
      password: (mode === 'rw' ? PG_PASS : PG_PASS_READER) || PG_PASS,
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

  public connect = async (mode: TConnectionMode): Promise<Connection> => {
    const { lock, connections, connectionOptions, connectionMode, connectionName } = this
    await lock.acquireAsync()
    try {
      if (!connections.has(mode)) {
        const options = connectionOptions(mode)
        logger.info(`Initializing ${connectionMode(mode)} connection: ${options.name}`)
        connections.set(mode, await createConnection(options))
      }
    } finally {
      lock.release()
    }
    const connection = connections.get(mode)
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

  public disconnect = async (mode: TConnectionMode) => {
    const { lock, connections, connectionMode } = this
    try {
      await lock.acquireAsync()
      const connection = connections.get(mode)
      if (connection) {
        if (connection.isConnected) {
          logger.info(`Terminating ${connectionMode(mode)} connection: ${connection.options.name}`)
          await connection.close()
        }
        connections.delete(mode)
      }
    } finally {
      lock.release()
    }
  }

  public cli = (mode: TConnectionMode, options: ConnectionManagerCliOptions = {}) => {
    const { connectionOptions } = this
    // Make the "rw" connection the default for the TypeORM CLI by removing the connection name
    const { name, ...ormconfig } = connectionOptions(mode)
    return { ...ormconfig, cli: options }
  }

  constructor(private prefix: string, private options: ConnectionManagerOptions = {}) {}
}
