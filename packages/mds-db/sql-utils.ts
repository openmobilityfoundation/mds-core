// /////////////////////////////// SQL-related utilities /////////////////////////////
import { range, csv } from 'mds-utils'
import log from 'mds-logger'
import { MDSPostgresClient } from './migration'

const pgDebug = process.env.PG_DEBUG === 'true'

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function vals_list(cols: Readonly<string[]>, obj: any) {
  return cols.map(col_name => (obj[col_name] === undefined ? null : obj[col_name]))
}

// take a list of column names and a list of column values and reconstitue an object with those name/value pairs
export function vals_obj(cols: Readonly<string[]>, list: (string | number)[]) {
  const obj: { [propName: string]: string | number } = {}

  /* eslint-disable no-return-assign */
  range(cols.length).map((i: number) => (obj[cols[i]] = list[i]))
  /* eslint-enable no-return-assign */

  return obj
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
  /* eslint-disable no-param-reassign */
  if (typeof values === 'undefined') {
    values = []
  }
  if (typeof values !== 'string') {
    values = values.map(val => {
      return String(val)
    })
  }

  /* eslint-enable no-param-reassign */
  log.info('sql>', sql, values)
}

export class SqlVals {
  public vals: (string | number)[]

  private index: number

  public constructor() {
    this.vals = []
    this.index = 1
  }

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
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
