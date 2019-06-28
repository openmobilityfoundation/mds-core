import { Client as PostgresClient, types as PostgresTypes } from 'pg'
import { AUDIT_EVENT_TYPES } from 'mds-enums'

import { csv } from 'mds-utils'

import log from 'mds-logger'
import schema from './schema'
import { logSql, SqlExecuter } from './sql-utils'

export interface PGInfo {
  user?: string
  database?: string
  host?: string
  password?: string
  port?: number
  client_type?: string
}

class MDSPostgresClient extends PostgresClient {
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
    const client_type = params.client_type || 'readonly'
    // eslint-disable-next-line no-param-reassign
    delete params.client_type
    super(params)

    this.client_type = client_type
    this.connected = false
  }

  public setConnected(connected: boolean) {
    this.connected = connected
  }
}

function configureClient(pg_info: PGInfo) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.on('error', (err: any) => {
    // log.info('pg client error event', err.stack)
    log.error('pg client error event', err.stack)
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.on('notice', (msg: any) => {
    log.warn('notice:', msg)
  })

  if (!client) {
    throw Error('no way to connect to PG')
  }
  return client
}

/**
 * drop tables from a list of table names
 */
async function dropTables(client: MDSPostgresClient) {
  const drop = `DROP TABLE IF EXISTS ${csv(Object.keys(schema.tables))};`
  logSql(drop)
  await client.query(drop)
  await log.info('postgres drop table succeeded')
}

/**
 * create tables from a list of table names
 */
async function createTables(client: MDSPostgresClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing: { rows: any[]; [propName: string]: any } = await client.query(
    'SELECT table_name FROM information_schema.tables WHERE table_catalog = CURRENT_CATALOG AND table_schema= CURRENT_SCHEMA'
  )

  const missing: string[] = Object.keys(schema.tables).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (table: string) => !existing.rows.find((row: any) => row.table_name === table)
  )
  if (missing.length > 0) {
    await log.warn('existing', JSON.stringify(existing.rows), 'missing', JSON.stringify(missing))
    const create: string = missing
      .map(
        (table: string) =>
          `CREATE TABLE ${table} (${schema.tables[table]
            .map((column: string) => `${column} ${schema.PG_TYPES[column]}`)
            .join(', ')}, PRIMARY KEY (${csv(schema.primaryKeys[table])}));`
      )
      .join('\n')
    logSql(create)
    await log.warn(create)
    await client.query(create)
    await log.info('postgres create table suceeded')
  }
}

function validateSchema() {
  Object.keys(schema.tables).forEach(table =>
    schema.tables[table].forEach((column: string) => {
      if (schema.PG_TYPES[column] === undefined) {
        throw Error(`no type defined for ${column} in ${table}`)
      }
    })
  )
}

async function addTimestampColumnToAuditsTable(client: MDSPostgresClient) {
  const TIMESTAMP_COL = 'timestamp'

  // Make sure this migration is still required
  if (schema.AUDITS_COLS.some((column: string) => column === TIMESTAMP_COL)) {
    const exec = SqlExecuter(client)
    // Make sure this migration hasn't already run
    const result = await exec(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${schema.AUDITS_TABLE}' AND column_name = '${TIMESTAMP_COL}' AND table_catalog = CURRENT_CATALOG AND table_schema= CURRENT_SCHEMA`
    )
    if (result.rowCount === 0) {
      // Do the migration
      await exec(
        `ALTER TABLE ${schema.AUDITS_TABLE} ADD COLUMN ${TIMESTAMP_COL} ${schema.PG_TYPES[TIMESTAMP_COL]} DEFAULT 0`
      )
      const updated = await exec(
        `UPDATE ${schema.AUDITS_TABLE} SET ${TIMESTAMP_COL} = COALESCE(${schema.AUDIT_EVENTS_TABLE}.timestamp, ${schema.AUDITS_TABLE}.recorded) FROM ${schema.AUDIT_EVENTS_TABLE} where ${schema.AUDIT_EVENTS_TABLE}.audit_trip_id = ${schema.AUDITS_TABLE}.audit_trip_id AND ${schema.AUDIT_EVENTS_TABLE}.audit_event_type = '${AUDIT_EVENT_TYPES.start}'`
      )
      await exec(`ALTER TABLE ${schema.AUDITS_TABLE} ALTER COLUMN ${TIMESTAMP_COL} DROP DEFAULT`)
      log.info('Migration addTimestampColumnToAuditsTable complete.', updated.rowCount, 'row(s) updated')
    }
  }
}

async function addAuditSubjectIdColumnToAuditEventsTable(client: MDSPostgresClient) {
  const AUDIT_SUBJECT_ID_COL = 'audit_subject_id'

  // Make sure this migration is still required
  if (schema.AUDIT_EVENTS_COLS.some((column: string) => column === AUDIT_SUBJECT_ID_COL)) {
    const exec = SqlExecuter(client)
    // Make sure this migration hasn't already run
    const result = await exec(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${schema.AUDIT_EVENTS_TABLE}' AND column_name = '${AUDIT_SUBJECT_ID_COL}' AND table_catalog = CURRENT_CATALOG AND table_schema= CURRENT_SCHEMA`
    )
    if (result.rowCount === 0) {
      // Do the migration
      await exec(
        `ALTER TABLE ${schema.AUDIT_EVENTS_TABLE} ADD COLUMN ${AUDIT_SUBJECT_ID_COL} ${schema.PG_TYPES[AUDIT_SUBJECT_ID_COL]} DEFAULT ''`
      )
      const updated = await exec(
        `UPDATE ${schema.AUDIT_EVENTS_TABLE} SET ${AUDIT_SUBJECT_ID_COL} = ${schema.AUDITS_TABLE}.audit_subject_id FROM ${schema.AUDITS_TABLE} where ${schema.AUDIT_EVENTS_TABLE}.audit_trip_id = ${schema.AUDITS_TABLE}.audit_trip_id`
      )
      await exec(`ALTER TABLE ${schema.AUDIT_EVENTS_TABLE} ALTER COLUMN ${AUDIT_SUBJECT_ID_COL} DROP DEFAULT`)
      log.info('Migration addAuditSubjectIdColumnToAuditEventsTable complete.', updated.rowCount, 'row(s) updated')
    }
  }
}
async function updateAuditEventsTablePrimaryKey(client: MDSPostgresClient) {
  const exec = SqlExecuter(client)
  // Change the PK to avoid errors when two events have the same timestamp
  const AUDIT_EVENTS_PK = csv(schema.primaryKeys[schema.AUDIT_EVENTS_TABLE])
  await exec(`ALTER TABLE ${schema.AUDIT_EVENTS_TABLE} DROP CONSTRAINT ${schema.AUDIT_EVENTS_TABLE}_pkey`)
  await exec(`ALTER TABLE ${schema.AUDIT_EVENTS_TABLE} ADD PRIMARY KEY (${AUDIT_EVENTS_PK})`)
  await log.info(
    `Migration updateAuditEventsTablePrimaryKey altered PK for "${schema.AUDITS_TABLE}" table to (${AUDIT_EVENTS_PK}).`
  )
}

async function removeAuditVehicleIdColumnFromAuditsTable(client: MDSPostgresClient) {
  const AUDIT_VEHICLE_ID_COL = 'audit_vehicle_id'
  const AUDIT_DEVICE_ID_COL = 'audit_device_id'
  // Only run if the audit_vehicle_id column has been removed from the schema
  if (!schema.AUDITS_COLS.some(column => column === AUDIT_VEHICLE_ID_COL)) {
    const exec = SqlExecuter(client)
    // Make sure this migration hasn't already run
    const result = await exec(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${schema.AUDITS_TABLE}' AND column_name = '${AUDIT_VEHICLE_ID_COL}' AND table_catalog = CURRENT_CATALOG AND table_schema= CURRENT_SCHEMA`
    )
    if (result.rowCount === 1) {
      // Convert audit_vehicle_id to a uuis and overwrite audit_device_id
      const updated = await exec(
        `UPDATE ${schema.AUDITS_TABLE} SET ${AUDIT_DEVICE_ID_COL} = uuid(${AUDIT_VEHICLE_ID_COL})`
      )
      await log.info(`Migration removeAuditVehicleIdColumnFromAuditsTable updated ${updated.rowCount} row(s).`)
      // Drop the audit_vehicle_id column
      await exec(`ALTER TABLE ${schema.AUDITS_TABLE} DROP COLUMN IF EXISTS ${AUDIT_VEHICLE_ID_COL}`)
      await log.info(
        `Migration removeAuditVehicleIdColumnFromAuditsTable dropped column "${AUDIT_VEHICLE_ID_COL}" from "${schema.AUDITS_TABLE}" table.`
      )
      await updateAuditEventsTablePrimaryKey(client)
    }
  }
}

async function recreateProviderTables(client: MDSPostgresClient) {
  const SEQUENCE_COL = 'sequence'
  const RECREATE_TABLES = csv([schema.TRIPS_TABLE, schema.STATUS_CHANGES_TABLE])

  // Make sure this migration is still required
  if (schema.TRIPS_COLS.some(column => column === SEQUENCE_COL)) {
    const exec = SqlExecuter(client)
    // Make sure this migration hasn't already run
    const result = await exec(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${schema.TRIPS_TABLE}' AND column_name = '${SEQUENCE_COL}' AND table_catalog = CURRENT_CATALOG AND table_schema= CURRENT_SCHEMA`
    )
    if (result.rowCount === 0) {
      // Do the migration
      await exec(`DROP TABLE IF EXISTS ${RECREATE_TABLES};`)
      log.info('Migration recreateProviderTables complete.', RECREATE_TABLES, 'tables(s) dropped')
      await createTables(client)
    }
  }
}
async function updateTables(client: MDSPostgresClient) {
  // Custom migrations run first (e.g. new non-nullable columns with no default value)
  await addTimestampColumnToAuditsTable(client)
  await addAuditSubjectIdColumnToAuditEventsTable(client)
  await removeAuditVehicleIdColumnFromAuditsTable(client)
  await recreateProviderTables(client)

  const exec = SqlExecuter(client)
  await Promise.all(
    Object.keys(schema.tables).map(table =>
      (async () => {
        const result = await exec(
          `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND table_catalog = CURRENT_CATALOG AND table_schema= CURRENT_SCHEMA`
        )
        const existing = result.rows.map(row => row.column_name)
        const drop = existing.filter(column => schema.tables[table].indexOf(column) < 0)
        const create = schema.tables[table].filter(column => existing.indexOf(column) < 0)
        if (drop.length > 0) {
          try {
            await exec(`ALTER TABLE ${table}\n${drop.map(column => `DROP COLUMN IF EXISTS ${column}`).join(',\n')};`)
            await log.info(`postgres drop column succeeded for table ${table}:`, ...drop)
          } catch (err) {
            await log.error(`postgres drop column failed for table ${table}:`, ...drop, err)
          }
        }
        if (create.length > 0) {
          try {
            await exec(
              `ALTER TABLE ${table}\n${create
                .map(column => `ADD COLUMN ${column} ${schema.PG_TYPES[column]}`)
                .join(',\n')};`
            )
            await log.info(`postgres create column succeeded for table ${table}:`, ...create)
          } catch (err) {
            await log.error(`postgres create column failed for table ${table}:`, ...create, err)
          }
        }
      })()
    )
  )
}

// Add the index, if it doesn't already exist.
async function addIndex(client: MDSPostgresClient, table: string, column: string, indexName: string) {
  const exec = SqlExecuter(client)

  if (!schema.tables[table].includes(column)) {
    // no need to build the index since that column's not there
    return
  }

  const index = `${indexName}_${table}`

  const result = await exec(`select tablename from pg_indexes where tablename='${table}' AND indexname = '${index}'`)

  if (result.rows.length > 0) {
    return
  }

  await exec(`create index ${index} on ${table}(${column})`)
}

async function updateSchema(client: MDSPostgresClient) {
  await validateSchema()
  await createTables(client)
  await updateTables(client)
  await Promise.all(
    Object.keys(schema.tables).map((table: string) => addIndex(client, table, 'recorded', 'idx_recorded'))
  )
}

export { updateSchema, MDSPostgresClient, configureClient, dropTables, createTables }
