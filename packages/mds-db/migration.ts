import { AUDIT_EVENT_TYPES } from 'mds-types'

import { csv } from 'mds-utils'

import log from 'mds-logger'
import schema from './schema'
import { logSql, SqlExecuter, MDSPostgresClient } from './sql-utils'

/**
 * drop tables from a list of table names
 */
async function dropTables(client: MDSPostgresClient) {
  const drop = `DROP TABLE IF EXISTS ${csv(Object.keys(schema.tables))};`
  await logSql(drop)
  await client.query(drop)
  await log.info('postgres drop table succeeded')
}

// Add the index, if it doesn't already exist.
async function addIndex(client: MDSPostgresClient, table: string, column: string) {
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
      await exec(`CREATE INDEX ${indexName} ON ${table}(${column})`)
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
    'SELECT table_name FROM information_schema.tables WHERE table_catalog = CURRENT_CATALOG AND table_schema= CURRENT_SCHEMA'
  )

  const missing = Object.keys(schema.tables).filter(table => !existing.rows.some(row => row.table_name === table))
  if (missing.length > 0) {
    await log.warn('existing', JSON.stringify(existing.rows), 'missing', JSON.stringify(missing))
    const create = missing
      .map(
        table =>
          `CREATE TABLE ${table} (${[schema.IDENTITY_COLUMN] // All tables have an IDENTITY column
            .concat(schema.tables[table])
            .map((column: string) => `${column} ${schema.PG_TYPES[column]}`)
            .join(', ')}, PRIMARY KEY (${csv(schema.primaryKeys[table])}));`
      )
      .join('\n')
    await logSql(create)
    await log.warn(create)
    await client.query(create)
    await log.info('postgres create table suceeded')

    await Promise.all(missing.map(table => addIndex(client, table, 'recorded')))
    await Promise.all(missing.map(table => addIndex(client, table, schema.IDENTITY_COLUMN)))
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
  if (!schema.AUDITS_COLS.some(column => (column as string) === AUDIT_VEHICLE_ID_COL)) {
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
  const PROVIDER_TRIP_ID = 'provider_trip_id'
  const RECREATE_TABLES = csv([schema.TRIPS_TABLE, schema.STATUS_CHANGES_TABLE])

  // Make sure this migration is still required
  if (schema.TRIPS_COLS.some(column => (column as string) === PROVIDER_TRIP_ID)) {
    const exec = SqlExecuter(client)
    // Make sure this migration hasn't already run
    const result = await exec(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${schema.TRIPS_TABLE}' AND column_name = '${PROVIDER_TRIP_ID}' AND table_catalog = CURRENT_CATALOG AND table_schema= CURRENT_SCHEMA`
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
        const { rows }: { rows: { column_name: string }[] } = await exec(
          `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND table_catalog = CURRENT_CATALOG AND table_schema= CURRENT_SCHEMA`
        )
        const existing = rows.map(row => row.column_name)
        const create = [schema.IDENTITY_COLUMN]
          .concat(schema.tables[table])
          .filter(column => existing.indexOf(column) < 0)
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

async function updateSchema(client: MDSPostgresClient) {
  await validateSchema()
  await createTables(client)
  await updateTables(client)
}

export { updateSchema, dropTables, createTables }
