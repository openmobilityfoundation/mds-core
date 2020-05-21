import logger from '@mds-core/mds-logger'

import { updateSchema } from './migration'
import { logSql, configureClient, MDSPostgresClient, SqlVals } from './sql-utils'

const { env } = process

type ClientType = 'writeable' | 'readonly'

let writeableCachedClient: MDSPostgresClient | null = null
let readOnlyCachedClient: MDSPostgresClient | null = null

async function setupClient(useWriteable: boolean): Promise<MDSPostgresClient> {
  const { PG_NAME, PG_USER, PG_PASS, PG_PORT, PG_MIGRATIONS = 'false' } = env
  let PG_HOST: string | undefined
  if (useWriteable) {
    ;({ PG_HOST } = env)
  } else {
    PG_HOST = env.PG_HOST_READER || env.PG_HOST
  }

  const client_type: ClientType = useWriteable ? 'writeable' : 'readonly'

  const info = {
    client_type,
    database: PG_NAME,
    user: PG_USER,
    host: PG_HOST || 'localhost',
    port: Number(PG_PORT) || 5432
  }

  logger.info('connecting to postgres:', ...Object.keys(info).map(key => (info as { [x: string]: unknown })[key]))

  const client = configureClient({ ...info, password: PG_PASS })

  try {
    await client.connect()
    if (useWriteable) {
      if (PG_MIGRATIONS === 'true') {
        await updateSchema(client)
      }
    }
    client.setConnected(true)
    return client
  } catch (err) {
    logger.error('postgres connection error', err.stack)
    client.setConnected(false)
    throw err
  }
}

export async function getReadOnlyClient(): Promise<MDSPostgresClient> {
  if (readOnlyCachedClient && readOnlyCachedClient.connected) {
    return readOnlyCachedClient
  }

  try {
    readOnlyCachedClient = await setupClient(false)
    return readOnlyCachedClient
  } catch (err) {
    readOnlyCachedClient = null
    logger.error('postgres connection error', err)
    throw err
  }
}

export async function getWriteableClient(): Promise<MDSPostgresClient> {
  if (writeableCachedClient && writeableCachedClient.connected) {
    return writeableCachedClient
  }

  try {
    writeableCachedClient = await setupClient(true)
    return writeableCachedClient
  } catch (err) {
    writeableCachedClient = null
    logger.error('postgres connection error', err)
    throw err
  }
}

// This should never be exported outside of this package, to prevent risk of SQL injection.
// Only functions in this module should ever call it.

/* eslint-reason ambigous helper function that wraps a query as Readonly */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export async function makeReadOnlyQuery(sql: string, vals?: SqlVals): Promise<any[]> {
  try {
    const values = vals?.values()
    const client = await getReadOnlyClient()
    await logSql(sql)
    const result = await client.query(sql, values)
    return result.rows
  } catch (err) {
    logger.error(`error with SQL query ${sql}`, err.stack || err)
    throw err
  }
}

export async function getLatestTime(table: string, field: string): Promise<number> {
  const client = await getReadOnlyClient()

  const sql = `SELECT ${field} FROM ${table} ORDER BY ${field} DESC LIMIT 1`

  await logSql(sql)
  const res = await client.query(sql)
  if (res.rows.length === 1) {
    return res.rows[0][field] as number
  }
  return 0 // no latest trip time, start from Dawn Of Time
}
