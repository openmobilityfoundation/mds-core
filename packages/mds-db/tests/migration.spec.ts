import sinon from 'sinon'
import test from 'unit.js'
import assert from 'assert'

import logger from '@mds-core/mds-logger'
import { updateSchema, createTables, dropTables } from '../migration'
import schema from '../schema'
import { PGInfo, configureClient } from '../sql-utils'

const { env } = process

const pg_info: PGInfo = {
  database: env.PG_NAME,
  host: env.PG_HOST || 'localhost',
  user: env.PG_USER,
  password: env.PG_PASS,
  port: Number(env.PG_PORT) || 5432
}

interface DBRow {
  /* eslint-reason ambiguous db function */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [propName: string]: any
  table_name: string
}

/* You'll need postgres running and the env variables
 * to be set to run these tests.
 */

if (pg_info.database) {
  describe('exercise migration methods', () => {
    before(async () => {
      const client = configureClient(pg_info)
      await client.connect()
      await dropTables(client)
      await client.end()
    })

    it('can create the tables', async () => {
      const client = configureClient(pg_info)
      await client.connect()
      await createTables(client)
      const result = await client.query(
        `SELECT table_name FROM information_schema.tables ` +
          `WHERE table_catalog = CURRENT_CATALOG AND table_schema=CURRENT_SCHEMA`
      )
      const table_names = result.rows
        .map((row: DBRow) => row.table_name)
        .filter(table => (schema.TABLES as string[]).includes(table))
        .sort()
      test.array(table_names).is(schema.TABLES.sort())
      await client.end()
    })

    it('can update the tables', async () => {
      const client = configureClient(pg_info)
      await client.connect()
      await updateSchema(client)
      const result = await client.query(
        `SELECT table_name FROM information_schema.tables ` +
          `WHERE table_catalog = CURRENT_CATALOG AND table_schema=CURRENT_SCHEMA`
      )
      const table_names = result.rows
        .map((row: DBRow) => row.table_name)
        .filter(table => (schema.TABLES as string[]).includes(table))
        .sort()
      test.array(table_names).is(schema.TABLES.sort())
      const indices_result = await client.query(`SELECT tablename FROM pg_indexes WHERE indexdef like '%idx_recorded%'`)
      const indices = indices_result.rows
        .map((row: DBRow) => row.tablename)
        .filter(table => (schema.TABLES as string[]).includes(table))
        .sort()
      test
        .array(indices)
        .is(schema.TABLES.sort().filter(table => schema.TABLE_COLUMNS[table].includes(schema.COLUMN.recorded)))
      await client.end()
    })

    it('can drop the tables', async () => {
      const client = configureClient(pg_info)
      await client.connect()
      await dropTables(client)
      const result = await client.query(
        `SELECT table_name FROM information_schema.tables ` +
          `WHERE table_catalog = CURRENT_CATALOG AND table_schema=CURRENT_SCHEMA`
      )
      const table_names = result.rows
        .map((row: DBRow) => row.table_name)
        .filter(table => (schema.TABLES as string[]).includes(table))
      test.array(table_names).is([])
      await client.end()
    })

    it('.createTables does not swallow errors', async () => {
      const client = configureClient(pg_info)
      await client.connect()
      sinon.stub(client, 'query').callsFake(function stubAThrow() {
        throw new Error('err')
      })
      // ensure the exception bubbles up and the client is forced to
      // handle it
      try {
        await createTables(client)
      } catch (err) {
        assert.ok(err instanceof Error)
        assert.deepStrictEqual(err.message, 'err')
      }
      await client.end()
    })

    it('.dropTables does not swallow errors', async () => {
      const client = configureClient(pg_info)
      await client.connect()
      sinon.stub(client, 'query').callsFake(function stubAThrow() {
        throw new Error('err')
      })
      // ensure the exception bubbles up
      try {
        await dropTables(client)
      } catch (err) {
        assert.ok(err instanceof Error)
        assert.deepStrictEqual(err.message, 'err')
      }
      await client.end()
    })

    it('.updateSchema does not swallow errors', async () => {
      const client = configureClient(pg_info)
      await client.connect()
      sinon.stub(client, 'query').callsFake(function stubAThrow() {
        throw new Error('err')
      })
      // ensure the exception bubbles up
      try {
        await updateSchema(client)
      } catch (err) {
        assert.ok(err instanceof Error)
        assert.deepStrictEqual(err.message, 'err')
      }
      logger.info('hangingon')
      await client.end()
      logger.info('hangingon')
    })
  })
}
