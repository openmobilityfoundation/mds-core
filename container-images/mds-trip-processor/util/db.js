const env = process.env

// database
let { enums, tables } = require('./db_info')
let { Client } = require('pg')
let cached_db_client = null

const log = require('loglevel')

if (env.PG_NAME) {
  async function getClient() {
    if (cached_db_client && cached_db_client.connected) {
      return cached_db_client
    }
    try {
      cached_db_client = new Client({
        user: env.PG_USER,
        database: env.PG_NAME,
        host: env.PG_HOST || 'localhost',
        password: env.PG_PASS,
        port: env.PG_PORT || 5432
      })
      cached_db_client.on('end', () => {
        cached_db_client.connected = false
      })
      cached_db_client.connected = false
      await cached_db_client.connect()
      cached_db_client.connected = true
      return cached_db_client
    } catch (err) {
      await log.error('postgres connection error', err.stack)
      cached_db_client.connected = false
      throw err
    }
  }

  async function syncDb(new_db) {}

  async function closeDbClient() {
    if (cached_db_client) {
      await cached_db_client.end()
    }
    cached_db_client = null // eslint-disable-line
  }

  function commaize(array, quote = `'`, join = ',') {
    return array.map(val => `${stringify(val, quote)}`).join(join)
  }

  function db_time(time) {
    let date_time = parseInt(time) ? parseInt(time) : time
    return (
      new Date(date_time)
        .toISOString()
        .replace('T', ' ')
        .substr(0, 23) + 'UTC'
    )
  }

  function stringify(data, quote, nested = false) {
    if (!data && data !== 0) {
      return `NULL`
    } else if (Array.isArray(data)) {
      // get type
      let type = ''
      let first = [data]
      while (first.length > 0 && Array.isArray(first[0])) {
        type = '[]' + type
        first = first[0]
      }

      first = first[0]
      switch (typeof first) {
        case 'object':
          type = 'JSON' + type
          break
        case 'string':
          type = 'varchar(31)' + type
          break
        default:
          type = typeof first + type
      }

      let commaized_content = commaize(
        data.map(data_element => stringify(data_element, `'`, true)),
        ``
      )
      let cast = !nested && type !== '[]'
      return `${cast ? 'CAST(' : ''}${
        nested ? '' : 'ARRAY'
      }[${commaized_content}]${cast ? ` AS ${type})` : ''}`
    } else if (typeof data === 'object') {
      return `${quote}${JSON.stringify(data)}${quote}`
    } else {
      return `${quote}${data}${quote}`
    }
  }

  async function setup() {
    if (!env.PG_PREFIX) {
      throw new Error('No PG_PREFIX defined')
    }
    // create enums
    for (let enum_key in enums) {
      // await runQuery(`DROP TYPE IF EXISTS ${key} CASCADE`)
      let type = await runQuery(
        `select exists (select 1 from pg_type where typname = '${enum_key}')`
      )
      if (!type[0].exists) {
        await runQuery(
          `CREATE TYPE ${enum_key} AS ENUM (${commaize(enums[enum_key])})`
        )
      }
    }

    for (let table_key in tables) {
      let fields = Object.keys(tables[table_key].fields)
      await runQuery(
        `CREATE TABLE IF NOT EXISTS ${tables[table_key].table} (${fields
          .map(
            innerkey =>
              `${innerkey} ${tables[table_key].fields[innerkey]} ` +
              `${
                tables[table_key].ok_null &&
                tables[table_key].ok_null.includes(innerkey)
                  ? ''
                  : 'NOT NULL'
              }`
          )
          .join(',')}, PRIMARY KEY(${commaize(
          tables[table_key].primary,
          `"`
        )}))`
      )
    }
  }

  async function runQuery(query) {
    let results = await (await getClient()).query(query)
    return results.rows
  }

  async function insert(type, data) {
    if (!data) {
      return null
    }

    let table_info = tables[type]
    let fields_array = Object.keys(table_info.fields)
    let query = `INSERT INTO ${table_info.table} (${commaize(
      fields_array,
      `"`
    )}) `
    log.info(
      commaize(
        fields_array.map(field =>
          field.includes('time') ? db_time(data[field]) : data[field]
        )
      )
    )
    query += `VALUES (${commaize(
      fields_array.map(field =>
        field.includes('time') ? db_time(data[field]) : data[field]
      )
    )})`
    log.info(query)
    return runQuery(query)
  }

  async function getCount(type) {
    return (await runQuery(`SELECT COUNT(*) FROM ${tables[type].table}`))[0]
      .count
  }

  async function reset(key) {
    await runQuery(`TRUNCATE ${tables[key].table}`)
  }

  module.exports = {
    syncDb,
    closeDbClient,
    setup,
    runQuery,
    insert,
    getCount,
    reset
  }
} else {
  let db = {}

  async function syncDb(new_db) {
    db = new_db
  }

  // don't do anything
  async function closeDbClient() {}

  // don't do anything
  async function setup() {}

  // don't do anything
  async function runQuery() {}

  async function insert(type, data) {
    if (!Object.prototype.hasOwnProperty.call(db, tables[type].table)) {
      db[tables[type].table] = []
    }
    let table = db[tables[type].table]
    let primary = tables[type].primary
    let filtered = table.filter(row => {
      for (let index in primary) {
        if (row[primary[index]] !== data[primary[index]]) {
          return false
        }
      }
      return true
    })

    if (!filtered.length) {
      table.push(data)
    } else {
      log.error('duplicate key problem')
    }
  }

  async function getCount(type) {
    if (!Object.prototype.hasOwnProperty.call(db, tables[type].table)) {
      return 0
    }
    return db[tables[type].table].length
  }

  async function reset(key) {
    db[tables[key].table] = []
  }

  module.exports = {
    syncDb,
    closeDbClient,
    setup,
    runQuery,
    insert,
    getCount,
    reset
  }
}
