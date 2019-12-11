import { csv, now } from '@mds-core/mds-utils'

import log from '@mds-core/mds-logger'
import schema, { COLUMN_NAME, TABLE_NAME } from './schema'
import { SqlExecuter, MDSPostgresClient, cols_sql, SqlExecuterFunction } from './sql-utils'

const MIGRATIONS = [
  'createMigrationsTable',
  'alterGeographiesColumns',
  'alterAuditEventsColumns',
  'alterPreviousGeographiesColumn',
  'dropDeprecatedProviderTables',
  'dropReadOnlyGeographyColumn',
  'dropAuditEventsColumns'
] as const
type MIGRATION = typeof MIGRATIONS[number]

// drop tables from a list of table names
async function dropTables(client: MDSPostgresClient) {
  const exec = SqlExecuter(client)
  const drop = csv(schema.DEPRECATED_PROVIDER_TABLES.concat(schema.TABLES))
  await exec(`DROP TABLE IF EXISTS ${drop};`)
  await log.info(`postgres drop table succeeded: ${drop}`)
}

// Add a foreign key if it doesn't already exist
async function addForeignKey(client: MDSPostgresClient, from: TABLE_NAME, to: TABLE_NAME, column: COLUMN_NAME) {
  const exec = SqlExecuter(client)
  const foreignKeyName = `fk_${to}_${column}`
  const sql = `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${foreignKeyName}') THEN
        ALTER TABLE ${from}
        ADD CONSTRAINT ${foreignKeyName}
        FOREIGN KEY (${column}) REFERENCES ${to} (${column});
      END IF;
    END;
    $$`
  await exec(sql)
}

// Add an index if it doesn't already exist
async function addIndex(
  client: MDSPostgresClient,
  table: TABLE_NAME,
  column: COLUMN_NAME,
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
  const exec = SqlExecuter(client)
  /* eslint-reason ambiguous DB function */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const existing: { rows: { table_name: string }[] } = await exec(
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
          `CREATE TABLE ${table} (${schema.TABLE_COLUMNS[table]
            .map(column => `${column} ${schema.COLUMN_TYPE[column]}`)
            .join(', ')}, PRIMARY KEY (${csv(schema.TABLE_KEY[table])}));`
      )
      .join('\n')
    await log.warn(create)
    await exec(create)
    await log.info('postgres create table suceeded')
    await Promise.all(missing.map(table => addIndex(client, table, schema.COLUMN.recorded)))
    await Promise.all(missing.map(table => addIndex(client, table, schema.COLUMN.id, { unique: true })))
    await addForeignKey(client, schema.TABLE.policy_metadata, schema.TABLE.policies, schema.COLUMN.policy_id)
    await addForeignKey(client, schema.TABLE.geography_metadata, schema.TABLE.geographies, schema.COLUMN.geography_id)
    // If the migrations table is being created then this is a new installation and all known migrations can be marked as run
    if (create.includes(schema.TABLE.migrations)) {
      await exec(
        `INSERT INTO ${schema.TABLE.migrations} (${cols_sql(schema.TABLE_COLUMNS.migrations)}) VALUES ${MIGRATIONS.map(
          migration => `('${migration}', ${now()})`
        ).join(', ')}`
      )
    }
  }
}

async function doMigration(
  exec: SqlExecuterFunction,
  migration: MIGRATION,
  migrate: (exec: SqlExecuterFunction) => Promise<void>
) {
  const { PG_MIGRATIONS, PG_DEBUG } = process.env
  const migrations = PG_MIGRATIONS ? PG_MIGRATIONS.split(',') : []
  if (migrations.includes('true') || migrations.includes(migration)) {
    const { rowCount } = await exec(
      `SELECT * FROM ${schema.TABLE.migrations} WHERE ${schema.COLUMN.migration} = '${migration}'`
    )
    if (rowCount === 0) {
      try {
        await exec(
          `INSERT INTO ${schema.TABLE.migrations} (${cols_sql(
            schema.TABLE_COLUMNS.migrations
          )}) VALUES ('${migration}', ${now()})`
        )
        process.env.PG_DEBUG = 'true'
        try {
          await log.warn('Running migration', migration)
          await migrate(exec)
          await log.warn('Migration', migration, 'succeeded')
        } catch (err) {
          await log.error('Migration', migration, 'failed', err)
        }
        process.env.PG_DEBUG = PG_DEBUG
      } catch {
        /* Another process is running this migration */
      }
    }
  }
}

async function alterGeographiesColumnsMigration(exec: SqlExecuterFunction) {
  await exec(`ALTER TABLE ${schema.TABLE.geographies} RENAME COLUMN previous_geography_ids TO previous_geographies`)
  await exec(
    `ALTER TABLE ${schema.TABLE.geographies} ADD COLUMN ${schema.COLUMN.publish_date} ${schema.COLUMN_TYPE.publish_date}`
  )
  await exec(
    `ALTER TABLE ${schema.TABLE.geographies} ADD COLUMN ${schema.COLUMN.effective_date} ${schema.COLUMN_TYPE.effective_date}`
  )
  await exec(
    `ALTER TABLE ${schema.TABLE.geographies} ADD COLUMN ${schema.COLUMN.description} ${schema.COLUMN_TYPE.description}`
  )
}

async function alterAuditEventsColumnsMigration(exec: SqlExecuterFunction) {
  await exec(`ALTER TABLE ${schema.TABLE.audit_events} ADD COLUMN provider_event_id bigint`)
  await exec(`ALTER TABLE ${schema.TABLE.audit_events} ADD COLUMN provider_event_type varchar(31)`)
  await exec(`ALTER TABLE ${schema.TABLE.audit_events} ADD COLUMN provider_event_type_reason varchar(31)`)
}

async function alterPreviousGeographiesColumnMigration(exec: SqlExecuterFunction) {
  await exec(
    `ALTER TABLE ${schema.TABLE.geographies} RENAME COLUMN previous_geographies TO ${schema.COLUMN.prev_geographies}`
  )
}

async function dropDeprecatedProviderTablesMigration(exec: SqlExecuterFunction) {
  await exec(`DROP TABLE IF EXISTS ${csv(schema.DEPRECATED_PROVIDER_TABLES)};`)
}

async function dropReadOnlyGeographyColumnMigration(exec: SqlExecuterFunction) {
  await exec(`ALTER TABLE ${schema.TABLE.geographies} DROP COLUMN read_only`)
}

async function dropAuditEventsColumnsMigration(exec: SqlExecuterFunction) {
  await exec(`ALTER TABLE ${schema.TABLE.audit_events} DROP COLUMN provider_event_id`)
  await exec(`ALTER TABLE ${schema.TABLE.audit_events} DROP COLUMN provider_event_type`)
  await exec(`ALTER TABLE ${schema.TABLE.audit_events} DROP COLUMN provider_event_type_reason`)
}

async function doMigrations(client: MDSPostgresClient) {
  const exec = SqlExecuter(client)
  await doMigration(exec, 'alterGeographiesColumns', alterGeographiesColumnsMigration)
  await doMigration(exec, 'alterAuditEventsColumns', alterAuditEventsColumnsMigration)
  await doMigration(exec, 'alterPreviousGeographiesColumn', alterPreviousGeographiesColumnMigration)
  await doMigration(exec, 'dropDeprecatedProviderTables', dropDeprecatedProviderTablesMigration)
  await doMigration(exec, 'dropReadOnlyGeographyColumn', dropReadOnlyGeographyColumnMigration)
  await doMigration(exec, 'dropAuditEventsColumns', dropAuditEventsColumnsMigration)
}

async function updateSchema(client: MDSPostgresClient) {
  await createTables(client)
  await doMigrations(client)
}

export { updateSchema, dropTables, createTables }
