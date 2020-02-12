import { VehicleEvent, Device, Telemetry } from '@mds-core/mds-types'
import log from '@mds-core/mds-logger'

import { dropTables, updateSchema } from './migration'
import { MDSPostgresClient } from './sql-utils'
import { getReadOnlyClient, getWriteableClient, makeReadOnlyQuery } from './client'

import * as devices from './devices'

import * as events from './events'

import * as policies from './policies'

import * as geographies from './geographies'

import * as audit from './audits'

import * as trips from './trips'

import * as telemetry from './telemetry'

import * as stops from './stops'

import * as attachments from './attachments'

import * as processors from './processors'

const { writeDevice } = devices
const { writeTelemetry } = telemetry
const { writeEvent } = events

async function initialize() {
  const client: MDSPostgresClient = await getWriteableClient()
  await dropTables(client)
  await updateSchema(client)
  await getReadOnlyClient()
  return 'postgres'
}

/*
 * Returns an array of currently running queries, ordered going from
 * oldest to youngest, and return some stats on how the db cache is doing
 * Interpreting results:
 * - If a query is old, that's probably bad.
 * - 'heap_blks_hit' = the number of blocks that were satisfied from the page cache
 * - 'heap_blks_read' = the number of blocks that had to hit disk/IO layer for reads
 * - When 'heap_blks_hit' is significantly greater than 'heap_blks_read',
 * it means we have a well-cached DB and most of the queries can be satisfied from the cache
 * - A good cache hit ratio is above 99%
 */
async function health(): Promise<{
  using: string
  stats: { current_running_queries: number; cache_hit_result: { heap_read: string; heap_hit: string; ratio: string } }
}> {
  log.info('postgres health check')
  const currentQueriesSQL = `SELECT query
    FROM pg_stat_activity
    WHERE query <> '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%' AND query <> ''
    ORDER BY query_start desc`
  const currentQueriesResult = await makeReadOnlyQuery(currentQueriesSQL)
  // Add 1 to the denominator so as to avoid divide by zero errors,
  // especially when testing locally since the db has basically
  // no traffic then
  const cacheHitQuery = `SELECT sum(heap_blks_read) as heap_read, sum(heap_blks_hit)
      as heap_hit, (sum(heap_blks_hit) - sum(heap_blks_read)) / sum(heap_blks_hit + 1)
      as ratio
      FROM pg_statio_user_tables;`
  const [cacheHitResult] = await makeReadOnlyQuery(cacheHitQuery)
  return {
    using: 'postgres',
    stats: {
      current_running_queries: currentQueriesResult.length,
      cache_hit_result: cacheHitResult
    }
  }
}

async function startup() {
  await Promise.all([getWriteableClient(), getReadOnlyClient()])
}

async function shutdown(): Promise<void> {
  try {
    const writeableClient = await getWriteableClient()
    await writeableClient.end()
    const readOnlyClient = await getReadOnlyClient()
    await readOnlyClient.end()
  } catch (err) {
    await log.error('error during disconnection', err.stack)
  }
}

async function seed(data: {
  devices?: Device[]
  events?: VehicleEvent[]
  // Making this parameter optional is necessary because if you map over an array of events to get an array of
  // telemetry objects, not every event has a corresponding telemetry object.
  // And sometimes it is necessary to seed some telemetry objects without corresponding events.
  telemetry?: Telemetry[]
}) {
  if (data) {
    log.info('postgres seed start')
    if (data.devices) {
      await Promise.all(data.devices.map(async (device: Device) => writeDevice(device)))
    }
    log.info('postgres devices seeded')
    if (data.events) await Promise.all(data.events.map(async (event: VehicleEvent) => writeEvent(event)))
    log.info('postgres events seeded')
    if (data.telemetry) {
      await writeTelemetry(data.telemetry)
    }
    log.info('postgres seed done')
    return Promise.resolve()
  }
  return Promise.resolve('no data')
}

export = {
  initialize,
  health,
  seed,
  startup,
  shutdown,
  ...devices,
  ...events,
  ...policies,
  ...geographies,
  ...audit,
  ...trips,
  ...telemetry,
  ...stops,
  ...attachments,
  ...processors
}
