import { types as PostgresTypes } from 'pg'
import { MdsNamingStrategy } from '@mds-core/mds-orm/naming-strategies'
import { LoggerOptions } from 'typeorm/logger/LoggerOptions'
import { ConnectionOptions } from 'typeorm'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'

const loggingOption = (options: string): LoggerOptions => {
  return ['false', 'true', 'all'].includes(options) ? options !== 'false' : (options.split(' ') as LoggerOptions)
}

const ConnectionNames = ['ro', 'rw'] as const
export type ConnectionName = typeof ConnectionNames[number]

// Use parseInt for bigint columns so the values get returned as numbers instead of strings
PostgresTypes.setTypeParser(20, Number)

const { PG_HOST, PG_HOST_READER, PG_PORT, PG_USER, PG_PASS, PG_NAME, PG_DEBUG = 'false' } = process.env

export const Connections = (options: Partial<PostgresConnectionOptions> = {}): ConnectionOptions[] =>
  ConnectionNames.map(name => ({
    name,
    type: 'postgres',
    host: (name === 'rw' ? PG_HOST : PG_HOST_READER) || PG_HOST || 'localhost',
    port: Number(PG_PORT) || 5432,
    username: PG_USER,
    password: PG_PASS,
    database: PG_NAME,
    logging: loggingOption(PG_DEBUG.toLowerCase()),
    maxQueryExecutionTime: 3000,
    logger: 'simple-console',
    synchronize: false,
    migrationsRun: true,
    migrationsTableName: 'migration_history',

    namingStrategy: new MdsNamingStrategy(),
    cli: {
      entitiesDir: './entities',
      migrationsDir: './migrations'
    },
    ...options
  }))
