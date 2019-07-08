// /////////////////////////////// SQL-related utilities /////////////////////////////
import { Client as PostgresClient, types as PostgresTypes } from 'pg'
import { range, csv } from 'mds-utils'
import log from 'mds-logger'

const pgDebug = process.env.PG_DEBUG === 'true'

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
}

export function configureClient(pg_info: PGInfo) {
  // Use parseInt for bigint columns so the values get returned as numbers instead of strings
  PostgresTypes.setTypeParser(20, parseInt)
  log.info('configured new client')

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

  client.on('error', err => {
    log.error('pg client error event', err.stack)
  })

  client.on('notice', msg => {
    log.warn('notice:', msg)
  })

  if (!client) {
    throw Error('no way to connect to PG')
  }
  return client
}

// convert a list of column names to an SQL string of the form (e.g.) "VALUES($1, $2, $3)"
export function vals_sql(cols: Readonly<string[]>) {
  const list = range(cols.length).map((i: number) => `$${i + 1}`)
  return `VALUES (${csv(list)})`
}

// convert a table and its column names into an SQL string of the form (e.g.) "table_name(col1_name, col2_name, col3_name)"
export function cols_sql(table: string, cols: Readonly<string[]>) {
  return `${table}(${csv(cols)})`
}

// take a list of column names and extract the values into a list for SQL insertion
export function vals_list(cols: Readonly<string[]>, obj: { [s: string]: unknown }) {
  return cols.map(col_name => (obj[col_name] === undefined ? null : obj[col_name]))
}

// take a list of column names and a list of column values and reconstitue an object with those name/value pairs
export function vals_obj(cols: Readonly<string[]>, list: (string | number)[]): { [propName: string]: string | number } {
  return range(cols.length).reduce((map, i: number) => Object.assign(map, { [i]: list[i] }), {})
}

// convert an object to sql string representation
export function to_sql(obj: boolean | number | string | object[] | null | object | undefined) {
  // bools
  if (obj === true || obj === false) {
    return `${obj}`
  }
  // numbers
  if (typeof obj === 'number') {
    return `${obj}`
  }
  // strings
  if (typeof obj === 'string') {
    return `'${obj}'`
  }
  if (Array.isArray(obj)) {
    return `'{${csv(obj.map(o => `"${o}"`))}}'`
  }
  if (obj === null) {
    return 'null'
  }
  // object
  if (typeof obj === 'object') {
    throw new Error(`can't render object to sql: ${JSON.stringify(obj)}`)
  }
  return 'null'
}

// logging specific to sql debugging.  can be turned on/off using PG_DEBUG env var.
export function logSql(sql: string, ...values: unknown[]): void {
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
