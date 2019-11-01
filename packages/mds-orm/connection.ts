import { createConnection } from 'typeorm'
import { LoggerOptions } from 'typeorm/logger/LoggerOptions'
import { DeviceEntity } from './entities/DeviceEntity'

const loggingOption = (options: string): LoggerOptions => {
  return ['false', 'true', 'all'].includes(options) ? options !== 'false' : (options.split(' ') as LoggerOptions)
}

const ConnectionNames = ['ro', 'rw'] as const
type ConnectionName = typeof ConnectionNames[number]

const getConnection = async (name: ConnectionName) => {
  const { PG_HOST, PG_HOST_READER, PG_PORT, PG_USER, PG_PASS, PG_NAME, PG_DEBUG = 'false' } = process.env
  const connection = await createConnection({
    name,
    type: 'postgres',
    host: (name === 'rw' ? PG_HOST : PG_HOST_READER) || PG_HOST || 'localhost',
    port: Number(PG_PORT) || 5432,
    username: PG_USER,
    password: PG_PASS,
    database: PG_NAME,
    synchronize: true,
    logging: loggingOption(PG_DEBUG.toLowerCase()),
    maxQueryExecutionTime: 1000,
    logger: 'simple-console',
    entities: [DeviceEntity]
  })
  if (!connection) throw Error('Connection Error')
  return connection
}

export const getReadOnlyConnection = async () => getConnection('ro')

export const getReadWriteConnection = async () => getConnection('rw')
