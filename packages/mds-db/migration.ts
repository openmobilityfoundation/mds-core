import { AUDIT_EVENT_TYPES } from '@mds-core/mds-types'

import { csv } from '@mds-core/mds-utils'

import log from '@mds-core/mds-logger'
import schema from './schema'
import { logSql, SqlExecuter, MDSPostgresClient } from './sql-utils'

/**
 * drop tables from a list of table names
 */
async function dropTables(client: MDSPostgresClient) {
  const drop = `DROP TABLE IF EXISTS ${csv(schema.TABLES)};`
  await logSql(drop)
  await client.query(drop)
  await log.info('postgres drop table succeeded')
}

// Add the index, if it doesn't already exist.
async function addIndex(
  client: MDSPostgresClient,
  table: string,
  column: string,
  options: Partial<{ unique: boolean }> = { unique: false }
) {
  const exec = SqlExecuter(client)
  const indexName = `idx_${column}_${table}`

  const {
    rows: { length: hasColumn }
  } = await exec(
    `SELECT column_name FROM information_schema.columns WHERE table_name='${table}' AND column_name='${column}' AND table_catalog=CURRENT_CATALOG AND table_schema=CURRENT_SCHEMA`
  )

  if (hasColumn) {
    const {
      rows: { length: hasIndex }
    } = await exec(`SELECT tablename FROM pg_indexes WHERE tablename='${table}' AND indexname='${indexName}'`)

    if (!hasIndex) {
      await exec(`CREATE${options.unique ? ' UNIQUE ' : ' '}INDEX ${indexName} ON ${table}(${column})`)
    }
  }
}

/**
 * create tables from a list of table names
 */
async function createTables(client: MDSPostgresClient) {
  /* eslint-reason ambiguous DB function */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const existing: { rows: { table_name: string }[] } = await client.query(
    'SELECT table_name FROM information_schema.tables WHERE table_catalog = CURRENT_CATALOG AND table_schema = CURRENT_SCHEMA'
  )

  const missing = schema.TABLES.filter(
    /* eslint-reason ambiguous DB function */
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    (table: string) => !existing.rows.find((row: any) => row.table_name === table)
  )
  if (missing.length > 0) {
    await log.warn('existing', JSON.stringify(existing.rows), 'missing', JSON.stringify(missing))
    const create = missing
      .map(
        table =>
          `CREATE TABLE ${table} (${schema.COLUMNS[table]
            .map(column => `${column} ${schema.COLUMN_TYPE[column]}`)
            .join(', ')}, PRIMARY KEY (${csv(schema.PRIMARY_KEY[table])}));`
      )
      .join('\n')
    await logSql(create)
    await log.warn(create)
    await client.query(create)
    await log.info('postgres create table suceeded')
    await Promise.all(missing.map(table => addIndex(client, table, 'recorded')))
    await Promise.all(missing.map(table => addIndex(client, table, schema.COLUMN.id, { unique: true })))
  }
}

async function addTimestampColumnToAuditsTable(client: MDSPostgresClient) {
  // Make sure this migration is still required
  if (schema.COLUMNS.audits.some((column: string) => column === schema.COLUMN.timestamp)) {
    const exec = SqlExecuter(client)
    // Make sure this migration hasn't already run
    const result = await exec(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${schema.TABLE.audits}' AND column_name = '${schema.COLUMN.timestamp}' AND table_catalog = CURRENT_CATALOG AND table_schema = CURRENT_SCHEMA`
    )
    if (result.rowCount === 0) {
      // Do the migration
      await exec(
        `ALTER TABLE ${schema.TABLE.audits} ADD COLUMN ${schema.COLUMN.timestamp} ${
          schema.COLUMN_TYPE[schema.COLUMN.timestamp]
        } DEFAULT 0`
      )
      const updated = await exec(
        `UPDATE ${schema.TABLE.audits} SET ${schema.COLUMN.timestamp} = COALESCE(${schema.TABLE.audit_events}.timestamp, ${schema.TABLE.audits}.recorded) FROM ${schema.TABLE.audit_events} where ${schema.TABLE.audit_events}.audit_trip_id = ${schema.TABLE.audits}.audit_trip_id AND ${schema.TABLE.audit_events}.audit_event_type = '${AUDIT_EVENT_TYPES.start}'`
      )
      await exec(`ALTER TABLE ${schema.TABLE.audits} ALTER COLUMN ${schema.COLUMN.timestamp} DROP DEFAULT`)
      log.info('Migration addTimestampColumnToAuditsTable complete.', updated.rowCount, 'row(s) updated')
    }
  }
}

async function addAuditSubjectIdColumnToAuditEventsTable(client: MDSPostgresClient) {
  // Make sure this migration is still required
  if (schema.COLUMNS.audit_events.some((column: string) => column === schema.COLUMN.audit_subject_id)) {
    const exec = SqlExecuter(client)
    // Make sure this migration hasn't already run
    const result = await exec(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${schema.TABLE.audit_events}' AND column_name = '${schema.COLUMN.audit_subject_id}' AND table_catalog = CURRENT_CATALOG AND table_schema = CURRENT_SCHEMA`
    )
    if (result.rowCount === 0) {
      // Do the migration
      await exec(
        `ALTER TABLE ${schema.TABLE.audit_events} ADD COLUMN ${schema.COLUMN.audit_subject_id} ${
          schema.COLUMN_TYPE[schema.COLUMN.audit_subject_id]
        } DEFAULT ''`
      )
      const updated = await exec(
        `UPDATE ${schema.TABLE.audit_events} SET ${schema.COLUMN.audit_subject_id} = ${schema.TABLE.audits}.audit_subject_id FROM ${schema.TABLE.audits} where ${schema.TABLE.audit_events}.audit_trip_id = ${schema.TABLE.audits}.audit_trip_id`
      )
      await exec(`ALTER TABLE ${schema.TABLE.audit_events} ALTER COLUMN ${schema.COLUMN.audit_subject_id} DROP DEFAULT`)
      log.info('Migration addAuditSubjectIdColumnToAuditEventsTable complete.', updated.rowCount, 'row(s) updated')
    }
  }
}
async function updateAuditEventsTablePrimaryKey(client: MDSPostgresClient) {
  const exec = SqlExecuter(client)
  // Change the PK to avoid errors when two events have the same timestamp
  const AUDIT_EVENTS_PK = csv(schema.PRIMARY_KEY[schema.TABLE.audit_events])
  await exec(`ALTER TABLE ${schema.TABLE.audit_events} DROP CONSTRAINT ${schema.TABLE.audit_events}_pkey`)
  await exec(`ALTER TABLE ${schema.TABLE.audit_events} ADD PRIMARY KEY (${AUDIT_EVENTS_PK})`)
  await log.info(
    `Migration updateAuditEventsTablePrimaryKey altered PK for "${schema.TABLE.audits}" table to (${AUDIT_EVENTS_PK}).`
  )
}

async function removeAuditVehicleIdColumnFromAuditsTable(client: MDSPostgresClient) {
  const DEPRECATED_AUDIT_VEHICLE_ID_COL = 'audit_vehicle_id'

  // Only run if the audit_vehicle_id column has been removed from the schema
  if (!schema.COLUMNS.audits.some(column => (column as string) === DEPRECATED_AUDIT_VEHICLE_ID_COL)) {
    const exec = SqlExecuter(client)
    // Make sure this migration hasn't already run
    const result = await exec(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${schema.TABLE.audits}' AND column_name = '${DEPRECATED_AUDIT_VEHICLE_ID_COL}' AND table_catalog = CURRENT_CATALOG AND table_schema = CURRENT_SCHEMA`
    )
    if (result.rowCount === 1) {
      // Convert audit_vehicle_id to a uuid and overwrite audit_device_id
      const updated = await exec(
        `UPDATE ${schema.TABLE.audits} SET ${schema.COLUMN.audit_device_id} = uuid(${DEPRECATED_AUDIT_VEHICLE_ID_COL})`
      )
      await log.info(`Migration removeAuditVehicleIdColumnFromAuditsTable updated ${updated.rowCount} row(s).`)
      // Drop the audit_vehicle_id column
      await exec(`ALTER TABLE ${schema.TABLE.audits} DROP COLUMN IF EXISTS ${DEPRECATED_AUDIT_VEHICLE_ID_COL}`)
      await log.info(
        `Migration removeAuditVehicleIdColumnFromAuditsTable dropped column "${DEPRECATED_AUDIT_VEHICLE_ID_COL}" from "${schema.TABLE.audits}" table.`
      )
      await updateAuditEventsTablePrimaryKey(client)
    }
  }
}

async function recreateProviderTables(client: MDSPostgresClient) {
  const RECREATE_TABLES = csv([schema.TABLE.trips, schema.TABLE.status_changes])

  // Make sure this migration is still required
  if (schema.COLUMNS.trips.some(column => (column as string) === schema.COLUMN.provider_trip_id)) {
    const exec = SqlExecuter(client)
    // Make sure this migration hasn't already run
    const result = await exec(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${schema.TABLE.trips}' AND column_name = '${schema.COLUMN.provider_trip_id}' AND table_catalog = CURRENT_CATALOG AND table_schema = CURRENT_SCHEMA`
    )
    if (result.rowCount === 0) {
      // Do the migration
      await exec(`DROP TABLE IF EXISTS ${RECREATE_TABLES};`)
      log.info('Migration recreateProviderTables complete.', RECREATE_TABLES, 'tables(s) dropped')
      await createTables(client)
    }
  }
}

async function addIdentityColumnToAllTables(client: MDSPostgresClient) {
  const exec = SqlExecuter(client)

  const { rows: existing }: { rows: { table_name: string }[] } = await exec(
    `SELECT table_name FROM information_schema.columns WHERE column_name = '${schema.COLUMN.id}' AND table_catalog = CURRENT_CATALOG AND table_schema = CURRENT_SCHEMA`
  )

  const create = schema.TABLES.filter(name => schema.COLUMNS[name].some(col => col === schema.COLUMN.id)).filter(
    name => !existing.some(({ table_name }) => table_name === name)
  )

  if (create.length > 0) {
    try {
      await exec(
        create
          .map(table => `ALTER TABLE ${table} ADD COLUMN ${schema.COLUMN.id} ${schema.COLUMN_TYPE[schema.COLUMN.id]};`)
          .join('\n')
      )
      await log.info(
        `Migration addIdentityColumnToAllTables create ${schema.COLUMN.id} column succeeded for:`,
        ...create
      )
    } catch (err) {
      await log.error(
        `Migration addIdentityColumnToAllTables create ${schema.COLUMN.id} column failed for:`,
        ...create,
        err
      )
    }
  }
}

async function updateTables(client: MDSPostgresClient) {
  const { PG_MIGRATIONS } = process.env
  const migrations = PG_MIGRATIONS ? PG_MIGRATIONS.split(',') : []
  // Custom migrations run first (e.g. new non-nullable columns with no default value)
  await addTimestampColumnToAuditsTable(client)
  await addAuditSubjectIdColumnToAuditEventsTable(client)
  await removeAuditVehicleIdColumnFromAuditsTable(client)
  await recreateProviderTables(client)
  if (migrations.includes('addIdentityColumnToAllTables')) {
    await addIdentityColumnToAllTables(client)
  }
}

async function updateSchema(client: MDSPostgresClient) {
  await createTables(client)
  await updateTables(client)
}

export { updateSchema, dropTables, createTables }
