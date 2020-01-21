import { createConnection, Connection, ConnectionOptions } from 'typeorm'
import { LoggerOptions } from 'typeorm/logger/LoggerOptions'
import { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver'

const loggingOption = (options: string): LoggerOptions => {
  return ['false', 'true', 'all'].includes(options) ? options !== 'false' : (options.split(' ') as LoggerOptions)
}

const ConnectionNames = ['ro', 'rw'] as const
type ConnectionName = typeof ConnectionNames[number]

const getConnection = async (name: ConnectionName, entities: Function[]) => {
  const { PG_HOST, PG_HOST_READER, PG_PORT, PG_USER, PG_PASS, PG_NAME, PG_DEBUG = 'false' } = process.env

  const options: ConnectionOptions = {
    name,
    type: 'postgres',
    host: (name === 'rw' ? PG_HOST : PG_HOST_READER) || PG_HOST || 'localhost',
    port: Number(PG_PORT) || 5432,
    username: PG_USER,
    database: PG_NAME,
    logging: loggingOption(PG_DEBUG.toLowerCase()),
    maxQueryExecutionTime: 1000,
    logger: 'simple-console',
    synchronize: false
  }

  const connection = await createConnection({
    ...options,
    password: PG_PASS,
    entities
  })

  if (!connection) throw Error('Connection Error')

  // Use parseInt for bigint columns so the values get returned as numbers instead of strings
  const { postgres } = connection.driver as PostgresDriver
  postgres.types.setTypeParser(20, Number)

  return connection
}

export const ConnectionManager = (...entities: Function[]) => {
  const connections: Partial<{ [C in ConnectionName]: Connection }> = {}
  return {
    getConnection: async (name: ConnectionName) => {
      const connection = connections[name] ?? (await getConnection(name, entities))
      if (!connection.isConnected) {
        await connection.connect()
      }
      connections[name] = connection
      return connection
    }
  }
}
