import { VehicleEvent, UUID, Timestamp, Device, Telemetry, Recorded, Rule, VEHICLE_EVENT } from '@mds-core/mds-types'
import {
  convertTelemetryToTelemetryRecord,
  convertTelemetryRecordToTelemetry,
  now,
  isUUID,
  isTimestamp,
  days,
  yesterday,
  csv
} from '@mds-core/mds-utils'
import log from '@mds-core/mds-logger'

import { QueryResult } from 'pg'
import { dropTables, updateSchema } from './migration'
import { ReadStatusChangesResult, StatusChange, TelemetryRecord } from './types'

import schema from './schema'

import { cols_sql, vals_list, to_sql, logSql, SqlVals, SqlExecuter, MDSPostgresClient } from './sql-utils'

import { getReadOnlyClient, getWriteableClient, makeReadOnlyQuery } from './client'
import { readDeviceByVehicleId, readDeviceIds, readDevice, readDeviceList, writeDevice, updateDevice } from './devices'
import {
  writeEvent,
  readEvent,
  readEvents,
  readEventsForStatusChanges,
  readHistoricalEvents,
  getEventCountsPerProviderSince,
  getEventsLast24HoursPerProvider,
  getNumEventsLast24HoursByProvider,
  readEventsWithTelemetry
} from './events'

import {
  readPolicies,
  writePolicy,
  readPolicy,
  editPolicy,
  deletePolicy,
  writePolicyMetadata,
  updatePolicyMetadata,
  readBulkPolicyMetadata,
  readSinglePolicyMetadata,
  publishPolicy,
  isPolicyPublished
} from './policies'

import {
  writeGeographyMetadata,
  updateGeographyMetadata,
  readSingleGeographyMetadata,
  readSingleGeography,
  readBulkGeographyMetadata,
  readGeographies,
  writeGeography,
  publishGeography,
  deleteGeography,
  isGeographyPublished,
  editGeography
} from './geographies'

import { readAudit, readAudits, writeAudit, deleteAudit, readAuditEvents, writeAuditEvent } from './audits'

import { writeTrips, updateTrip, readTrips, readTripList } from './trips'

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
async function writeTelemetry(telemetries: Telemetry[]): Promise<Recorded<Telemetry>[]> {
  if (telemetries.length === 0) {
    return []
  }
  try {
    const client = await getWriteableClient()

    const values = csv(
      telemetries
        .map(convertTelemetryToTelemetryRecord)
        .map(telemetry => csv(vals_list(schema.TABLE_COLUMNS.telemetry, { ...telemetry }).map(to_sql)))
        .map(row => `(${row})`)
    )

    const sql = `INSERT INTO ${schema.TABLE.telemetry} (${cols_sql(
      schema.TABLE_COLUMNS.telemetry
    )}) VALUES ${values} ON CONFLICT DO NOTHING RETURNING *`

    await logSql(sql)
    const start = now()
    const { rows: recorded_telemetries }: { rows: Recorded<TelemetryRecord>[] } = await client.query(sql)

    const delta = now() - start
    if (delta >= 300) {
      await log.info(
        `pg db writeTelemetry ${telemetries.length} rows, success in ${delta} ms with ${recorded_telemetries.length} unique`
      )
    }
    return recorded_telemetries.map(
      recorded_telemetry =>
        convertTelemetryRecordToTelemetry({
          ...telemetries.find(
            telemetry =>
              telemetry.device_id === recorded_telemetry.device_id &&
              telemetry.timestamp === recorded_telemetry.timestamp
          ),
          ...recorded_telemetry
        }) as Recorded<Telemetry>
    )
  } catch (err) {
    await log.error('pg write telemetry error', err)
    throw err
  }
}

async function readTelemetry(
  device_id: UUID,
  start?: Timestamp | undefined,
  stop?: Timestamp | undefined
): Promise<Recorded<Telemetry>[]> {
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  try {
    let sql = `SELECT * FROM ${schema.TABLE.telemetry} WHERE device_id=${vals.add(device_id)}`
    if (start === undefined && stop === undefined) {
      sql += ' ORDER BY "timestamp" DESC LIMIT 1'
    } else {
      if (start !== undefined) {
        sql += ` AND "timestamp" >= ${vals.add(start)}`
      }
      if (stop !== undefined) {
        sql += ` AND "timestamp" <= ${vals.add(stop)}`
      }
      sql += ' ORDER BY "timestamp"'
    }
    const values = vals.values()
    await logSql(sql, values)
    const res = await client.query(sql, values)
    return res.rows.map((row: TelemetryRecord) => {
      return convertTelemetryRecordToTelemetry(row) as Recorded<Telemetry>
    })
  } catch (err) {
    await log.error('read telemetry error', err)
    throw err
  }
}

async function wipeDevice(device_id: UUID): Promise<QueryResult> {
  const client = await getWriteableClient()
  const sql =
    `BEGIN;` +
    ` DELETE FROM ${schema.TABLE.devices} WHERE device_id='${device_id}';` +
    ` DELETE FROM ${schema.TABLE.telemetry} WHERE device_id='${device_id}';` +
    ` DELETE FROM ${schema.TABLE.events} WHERE device_id='${device_id}';` +
    ` COMMIT;`
  await logSql(sql)
  const res = await client.query(sql)
  // this returns a list of objects that represent the commands that just ran
  return res
}
async function getTelemetryCountsPerProviderSince(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: UUID; count: number; slacount: number }[]> {
  const one_day = days(1)
  const sql = `select provider_id, count(*), count(case when ((recorded-timestamp) > ${one_day}) then 1 else null end) as slacount from telemetry where recorded > ${start} and recorded < ${stop} group by provider_id`
  return makeReadOnlyQuery(sql)
}

async function getTripCountsPerProviderSince(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: string; count: number }[]> {
  const sql = `select provider_id, count(event_type) from events where event_type='trip_end' and recorded > ${start} and recorded < ${stop} group by provider_id, event_type`
  return makeReadOnlyQuery(sql)
}

async function getVehicleCountsPerProvider(): Promise<{ provider_id: UUID; count: number }[]> {
  const sql = `select provider_id, count(provider_id) from ${schema.TABLE.devices} group by provider_id`
  return makeReadOnlyQuery(sql)
}

async function getNumVehiclesRegisteredLast24HoursByProvider(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: UUID; count: number }[]> {
  const sql = `select provider_id, count(device_id) from ${schema.TABLE.devices} where recorded > ${start} and recorded < ${stop} group by provider_id`
  return makeReadOnlyQuery(sql)
}

async function getTripEventsLast24HoursByProvider(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: UUID; trip_id: UUID; event_type: VEHICLE_EVENT; recorded: number; timestamp: number }[]> {
  const sql = `select provider_id, trip_id, event_type, recorded, timestamp from ${schema.TABLE.events} where trip_id is not null and recorded > ${start} and recorded < ${stop} order by "timestamp"`
  return makeReadOnlyQuery(sql)
}

// TODO way too slow to be useful -- move into mds-cache
async function getMostRecentTelemetryByProvider(): Promise<{ provider_id: UUID; max: number }[]> {
  const sql = `select provider_id, max(recorded) from ${schema.TABLE.telemetry} group by provider_id`
  return makeReadOnlyQuery(sql)
}

// TODO way too slow to be useful -- move into mds-cache
async function getMostRecentEventByProvider(): Promise<{ provider_id: UUID; max: number }[]> {
  const sql = `select provider_id, max(recorded) from ${schema.TABLE.events} group by provider_id`
  return makeReadOnlyQuery(sql)
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

async function writeStatusChanges(status_changes: StatusChange[]): Promise<Recorded<StatusChange>[]> {
  if (status_changes.length === 0) {
    throw new Error('writeStatusChanges: zero status_changes')
  }
  try {
    const client = await getWriteableClient()
    const recorded = now()

    const values = csv(
      status_changes
        .map(sc =>
          csv(vals_list(schema.TABLE_COLUMNS.status_changes, { ...sc, recorded: sc.recorded || recorded }).map(to_sql))
        )
        .map(row => `(${row})`)
    )

    const sql = `INSERT INTO ${schema.TABLE.status_changes} (${cols_sql(
      schema.TABLE_COLUMNS.status_changes
    )}) VALUES ${values} ON CONFLICT DO NOTHING RETURNING *`

    await logSql(sql)
    const { rows: recorded_status_changes }: { rows: Recorded<StatusChange>[] } = await client.query(sql)
    return recorded_status_changes.map(recorded_status_change => ({
      ...status_changes.find(
        status_change =>
          status_change.device_id === recorded_status_change.device_id &&
          status_change.event_time === recorded_status_change.event_time
      ),
      ...recorded_status_change
    }))
  } catch (err) {
    await log.error('pg writeStatusChanges error', err)
    return err
  }
}

async function readStatusChanges(
  params: Partial<{
    skip: number
    take: number
    device_id: UUID
    provider_id: UUID
    start_time: Timestamp
    end_time: Timestamp
  }>
): Promise<ReadStatusChangesResult> {
  const client = await getReadOnlyClient()

  const { provider_id, device_id, start_time, end_time, skip, take } = params

  const vals = new SqlVals()
  const conditions = []

  if (provider_id) {
    if (!isUUID(provider_id)) {
      throw new Error(`invalid provider_id ${provider_id}`)
    } else {
      conditions.push(`provider_id = ${vals.add(provider_id)}`)
    }
  }

  if (device_id) {
    if (!isUUID(device_id)) {
      throw new Error(`invalid device_id ${device_id}`)
    } else {
      conditions.push(`device_id = ${vals.add(device_id)}`)
    }
  }

  if (start_time !== undefined) {
    if (!isTimestamp(start_time)) {
      throw new Error(`invalid start_time ${start_time}`)
    } else {
      conditions.push(`event_time >= ${vals.add(start_time)}`)
    }
  }

  if (end_time !== undefined) {
    if (!isTimestamp(end_time)) {
      throw new Error(`invalid end_time ${end_time}`)
    } else {
      conditions.push(`event_time <= ${vals.add(end_time)}`)
    }
  }

  const where = conditions.length === 0 ? '' : ` WHERE ${conditions.join(' AND ')}`

  const exec = SqlExecuter(client)

  const {
    rows: [{ count }]
  } = await exec(`SELECT COUNT(*) FROM ${schema.TABLE.status_changes} ${where}`, vals.values())

  if (count === 0) {
    return { count, status_changes: [] }
  }

  const { rows: status_changes } = await exec(
    `SELECT * FROM ${schema.TABLE.status_changes} ${where} ORDER BY id${skip ? ` OFFSET ${vals.add(skip)}` : ''}${
      take ? ` LIMIT ${vals.add(take)}` : ''
    }`,
    vals.values()
  )

  return { count, status_changes }
}

async function getLatestTime(table: string, field: string): Promise<number> {
  const client = await getReadOnlyClient()

  const sql = `SELECT ${field} FROM ${table} ORDER BY ${field} DESC LIMIT 1`

  await logSql(sql)
  const res = await client.query(sql)
  if (res.rows.length === 1) {
    return res.rows[0][field] as number
  }
  return 0 // no latest trip time, start from Dawn Of Time
}

async function getLatestStatusChangeTime(): Promise<number> {
  return getLatestTime(schema.TABLE.status_changes, 'event_time')
}

async function getLatestTripTime(): Promise<number> {
  return getLatestTime(schema.TABLE.trips, 'trip_end')
}
async function readRule(rule_id: UUID): Promise<Rule> {
  const client = await getReadOnlyClient()
  const sql = `SELECT * from ${schema.TABLE.policies} where EXISTS(SELECT FROM json_array_elements(policy_json->'rules') elem WHERE (elem->'rule_id')::jsonb ? '${rule_id}');`
  const res = await client.query(sql).catch(err => {
    throw err
  })
  if (res.rowCount !== 1) {
    throw new Error(`invalid rule_id ${rule_id}`)
  } else {
    const [{ policy_json }]: { policy_json: Policy }[] = res.rows
    const [rule] = policy_json.rules.filter(r => {
      return r.rule_id === rule_id
    })
    return rule
  }
}

async function readUnprocessedStatusChangeEvents(
  before: Recorded<VehicleEvent> | null,
  take = 1000
): Promise<{ count: number; events: Recorded<VehicleEvent>[] }> {
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const exec = SqlExecuter(client)

  const where = `WHERE ${(before ? [`E.id < ${before.id}`] : [])
    .concat(
      `NOT EXISTS (SELECT FROM ${schema.TABLE.status_changes} WHERE device_id = E.device_id AND event_time = E.timestamp)`
    )
    .join(' AND ')}`

  const {
    rows: [{ count }]
  } = await exec(`SELECT COUNT(*) FROM ${schema.TABLE.events} E ${where}`, vals.values())

  if (count === 0) {
    return { count, events: [] }
  }

  const { rows } = await exec(
    `SELECT E.*, T.lat, T.lng, T.timestamp AS telemetry_timestamp FROM (SELECT * FROM ${
      schema.TABLE.events
    } E ${where} ORDER BY E.id LIMIT ${vals.add(take)}) AS E LEFT JOIN ${
      schema.TABLE.telemetry
    } T ON E.device_id = T.device_id AND CASE WHEN E.telemetry_timestamp IS NULL THEN E.timestamp ELSE E.telemetry_timestamp END = T.timestamp`,
    vals.values()
  )

  return {
    count,
    events: rows.map(({ lat, lng, telemetry_timestamp, ...event }) => ({
      ...event,
      telemetry_timestamp,
      telemetry: telemetry_timestamp
        ? {
            timestamp: telemetry_timestamp,
            gps: { lat, lng }
          }
        : null
    }))
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

interface ReadTripIdsResult {
  count: number
  tripIds: UUID[]
}

interface ReadTripIdsQueryParams {
  skip: number
  take: number
  device_id: UUID
  min_end_time: Timestamp
  max_end_time: Timestamp
}

async function readTripIds(params: Partial<ReadTripIdsQueryParams> = {}): Promise<ReadTripIdsResult> {
  const { skip, take, device_id, min_end_time, max_end_time } = params

  const client = await getReadOnlyClient()

  if (typeof skip !== 'number' || skip < 0) {
    throw new Error('requires integer skip')
  }
  if (typeof take !== 'number' || skip < 0) {
    throw new Error('requires integer take')
  }

  const vals = new SqlVals()
  const conditions = [`event_type = 'trip_end'`]
  if (max_end_time) {
    conditions.push(`"timestamp" <= ${vals.add(Number(max_end_time))}`)
  }
  if (min_end_time) {
    conditions.push(`"timestamp" >= ${vals.add(Number(min_end_time))}`)
  }
  if (device_id) {
    conditions.push(`device_id = ${vals.add(device_id)}`)
  }

  const condSql = conditions.join(' AND ')

  try {
    const countSql = `SELECT COUNT(*) FROM ${schema.TABLE.events} WHERE ${condSql}`
    const countVals = vals.values()
    await logSql(countSql, countVals)
    const res = await client.query(countSql, countVals)
    const count = parseInt(res.rows[0].count)
    const selectSql = `SELECT * FROM ${schema.TABLE.events} WHERE ${condSql} ORDER BY "timestamp" OFFSET ${vals.add(
      skip
    )} LIMIT ${vals.add(take)}`
    const selectVals = vals.values()
    await logSql(selectSql, selectVals)
    const res2 = await client.query(selectSql, selectVals)
    return {
      tripIds: res2.rows.map(row => row.trip_id),
      count
    }
  } catch (err) {
    await log.error('readTripIds error', err)
    throw err
  }
}

export = {
  initialize,
  health,
  seed,
  startup,
  shutdown,
  readDeviceByVehicleId,
  readDeviceIds,
  readDevice,
  readDeviceList,
  writeDevice,
  updateDevice,
  readEvent,
  readEvents,
  readHistoricalEvents,
  writeEvent,
  readTelemetry,
  writeTelemetry,
  wipeDevice,
  readAudit,
  readAudits,
  writeAudit,
  deleteAudit,
  readAuditEvents,
  writeAuditEvent,
  writeTrips,
  updateTrip,
  readTrips,
  readTripList,
  readGeographies,
  writeGeography,
  publishGeography,
  deleteGeography,
  isGeographyPublished,
  editGeography,
  readPolicies,
  writePolicy,
  readPolicy,
  editPolicy,
  deletePolicy,
  writeGeographyMetadata,
  updateGeographyMetadata,
  readSingleGeographyMetadata,
  readSingleGeography,
  readBulkGeographyMetadata,
  writePolicyMetadata,
  updatePolicyMetadata,
  readBulkPolicyMetadata,
  readSinglePolicyMetadata,
  publishPolicy,
  isPolicyPublished,
  readRule,
  writeStatusChanges,
  readStatusChanges,
  getEventCountsPerProviderSince,
  getTelemetryCountsPerProviderSince,
  getTripCountsPerProviderSince,
  getLatestTripTime,
  getLatestStatusChangeTime,
  getNumVehiclesRegisteredLast24HoursByProvider,
  getMostRecentEventByProvider,
  getVehicleCountsPerProvider,
  getNumEventsLast24HoursByProvider,
  getMostRecentTelemetryByProvider,
  getTripEventsLast24HoursByProvider,
  getEventsLast24HoursPerProvider,
  readUnprocessedStatusChangeEvents,
  readEventsWithTelemetry,
  readTripIds,
  readEventsForStatusChanges
}
