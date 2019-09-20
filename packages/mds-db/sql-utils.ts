// /////////////////////////////// SQL-related utilities /////////////////////////////
import { Client as PostgresClient, types as PostgresTypes, QueryResultRow, QueryResult } from 'pg'
import { csv, DataIntegrityError } from '@mds-core/mds-utils'
import log from '@mds-core/mds-logger'
import schema from './schema'

const pgDebug = process.env.PG_DEBUG === 'true'

// logging specific to sql debugging.  can be turned on/off using PG_DEBUG env var.
export async function logSql(sql: string, ...values: unknown[]): Promise<void> {
  if (!pgDebug) {
    return
  }
  let out: unknown[]
  if (typeof values === 'undefined') {
    out = []
  } else if (typeof values !== 'string') {
    out = values.map(val => {
      return String(val)
    })
  } else {
    out = values
  }

  log.info('sql>', sql, out)
}

export interface PGInfo {
  user?: string
  database?: string
  host?: string
  password?: string
  port?: number
  client_type?: string
}

export class MDSPostgresClient extends PostgresClient {
  // There are no public methods in the node pg client to indicate when
  // the DB connection is ended, so we're going to subclass it.
  // As for why .connected is necessary, simply nulling out the cached
  // client variable in mds-db-postgres.js when calling `.end()` on a
  // client doesn't suffice for indicating a client object is no longer
  // useable. There is probably some weirdness with js scoping going on
  // but who cares, because this works well enough and is readable.
  // This won't connect to the DB until you call `.connect()`.
  public client_type: string

  public connected: boolean

  public constructor(params: PGInfo) {
    const { client_type, ...rest_params } = params
    if (client_type) {
      super(rest_params)

      this.client_type = client_type
      this.connected = false
    } else {
      super(params)

      this.client_type = 'read_only'
      this.connected = false
    }
  }

  public setConnected(connected: boolean) {
    this.connected = connected
  }

  // Runs a query and returns the selected rows as an array of objects of type R.
  public async select<R extends QueryResultRow>(command: string, values: (string | number)[] = []) {
    await logSql(command, values)
    const result: QueryResult<R> = await this.query(command, values)
    return result.rows
  }

  // Runs a query and returns a single selected row as an object of type R. An exception
  // is thrown if there are no selected rows or more than one selected row.
  public async selectOne<R extends QueryResultRow>(command: string, values: (string | number)[] = []) {
    const rows = await this.select<R>(command, values)
    if (rows.length !== 1) {
      throw new DataIntegrityError(`Expected exactly one matching row: actual=${rows.length}`)
    }
    return rows[0]
  }

  // Runs a query and returns a single selected row as an object of type R. An exception
  // is thrown if there is more than one selected row. null is returned if there are no
  // selected rows.
  public async selectOneOrNull<R extends QueryResultRow>(command: string, values: (string | number)[] = []) {
    const rows = await this.select<R>(command, values)
    if (rows.length > 1) {
      throw new DataIntegrityError(`Expected at most one matching row: actual=${rows.length}`)
    }
    return rows.length === 0 ? null : rows[0]
  }

  // Runs a query and returns the first selected row as an object of type R. An exception
  // is thrown if there are no selected rows.
  public async selectFirst<R extends QueryResultRow>(command: string, values: (string | number)[] = []) {
    const rows = await this.select<R>(command, values)
    if (rows.length === 0) {
      throw new DataIntegrityError(`Expected at least one matching row: actual=${rows.length}`)
    }
    return rows[0]
  }

  // Runs a query and returns the first selected row as an object of type R. null is returned
  // if there are no selected rows.
  public async selectFirstOrNull<R extends QueryResultRow>(command: string, values: (string | number)[] = []) {
    const rows = await this.select<R>(command, values)
    return rows.length === 0 ? null : rows[0]
  }
}

export function configureClient(pg_info: PGInfo) {
  // Use parseInt for bigint columns so the values get returned as numbers instead of strings
  PostgresTypes.setTypeParser(20, parseInt)

  const client = new MDSPostgresClient({
    user: pg_info.user,
    database: pg_info.database,
    host: pg_info.host || 'localhost',
    password: pg_info.password,
    port: pg_info.port || 5432,
    client_type: pg_info.client_type
  })

  client.on('end', () => {
    client.setConnected(false)
    log.info('disconnected', client.client_type, 'client from postgres')
  })

  client.on('error', async err => {
    await log.error('pg client error event', err.stack)
  })

  client.on('notice', async msg => {
    await log.warn('notice:', msg)
  })

  if (!client) {
    throw Error('no way to connect to PG')
  }
  return client
}

// convert a list of column names to an SQL string of the form (e.g.) "VALUES($1, $2, $3)"
export function vals_sql(cols: Readonly<string[]>) {
  return csv(cols.filter(col => col !== schema.COLUMN.id).map((col, i) => `$${i + 1}`))
}

// convert a table and its column names into an SQL string of the form (e.g.) "table_name(col1_name, col2_name, col3_name)"
export function cols_sql(cols: Readonly<string[]>) {
  return csv(cols.filter(col => col !== schema.COLUMN.id))
}

// These are the types representing data that can be stored in db
type DBValueType = null | string | number | boolean | string[]

// take a list of column names and extract the values into a list for SQL insertion
// undefined is coerced to null and objects are treated as JSON and stringified
export function vals_list(cols: Readonly<string[]>, obj: { [s: string]: DBValueType | undefined | object }) {
  return cols
    .filter(col => col !== schema.COLUMN.id)
    .map(col => {
      const value = obj[col]
      if (value === undefined || value === null) {
        return null
      }
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        Array.isArray(value)
      ) {
        return value
      }
      return JSON.stringify(value)
    })
}

// convert an object to sql string representation
export function to_sql(value: DBValueType | undefined | object) {
  // bools
  if (value === true || value === false) {
    return `${value}`
  }
  // numbers
  if (typeof value === 'number') {
    return `${value}`
  }
  // strings
  if (typeof value === 'string') {
    return `'${value}'`
  }
  if (Array.isArray(value)) {
    return `'{${csv(value.map(o => `"${o}"`))}}'`
  }
  if (value === null) {
    return 'null'
  }
  // object
  if (typeof value === 'object') {
    throw new Error(`can't render object to sql: ${JSON.stringify(value)}`)
  }
  return 'null'
}

export class SqlVals {
  public vals: (string | number)[]

  private index: number

  public constructor() {
    this.vals = []
    this.index = 1
  }

  public add(value: string | number): string | number {
    this.vals.push(value)
    const literal = `$${this.index}`
    this.index += 1
    return literal
  }

  public values(): (string | number)[] {
    return this.vals.slice()
  }
}

export const SqlExecuter = (client: MDSPostgresClient) => async (command: string, values: (string | number)[] = []) => {
  await logSql(command, values)
  return client.query(command, values)
}

export type SqlExecuterFunction = ReturnType<typeof SqlExecuter>
