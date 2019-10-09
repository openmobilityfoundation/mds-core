import {
  Audit,
  AuditEvent,
  VehicleEvent,
  Geography,
  UUID,
  Policy,
  Timestamp,
  Device,
  Telemetry,
  Recorded,
  DeviceID,
  Rule,
  GeographyMetadata,
  PolicyMetadata,
  VEHICLE_EVENT
} from '@mds-core/mds-types'
import {
  convertTelemetryToTelemetryRecord,
  convertTelemetryRecordToTelemetry,
  now,
  isUUID,
  isTimestamp,
  seconds,
  days,
  yesterday,
  csv,
  NotFoundError,
  BadParamsError,
  AlreadyPublishedError
} from '@mds-core/mds-utils'
import log from '@mds-core/mds-logger'

import { QueryResult } from 'pg'
import { dropTables, updateSchema } from './migration'
import {
  ReadEventsResult,
  ReadTripsResult,
  ReadStatusChangesResult,
  StatusChange,
  Trip,
  TelemetryRecord,
  ReadEventsQueryParams,
  ReadHistoricalEventsQueryParams,
  ReadAuditsQueryParams
} from './types'

import schema from './schema'

import {
  vals_sql,
  cols_sql,
  vals_list,
  to_sql,
  logSql,
  SqlVals,
  SqlExecuter,
  configureClient,
  MDSPostgresClient
} from './sql-utils'

const { env } = process

type ClientType = 'writeable' | 'readonly'

let writeableCachedClient: MDSPostgresClient | null = null
let readOnlyCachedClient: MDSPostgresClient | null = null

async function setupClient(useWriteable: boolean): Promise<MDSPostgresClient> {
  const { PG_NAME, PG_USER, PG_PASS, PG_PORT, PG_MIGRATIONS = 'false' } = env
  let PG_HOST: string | undefined
  if (useWriteable) {
    ;({ PG_HOST } = env)
  } else {
    PG_HOST = env.PG_HOST_READER || env.PG_HOST
  }

  const client_type: ClientType = useWriteable ? 'writeable' : 'readonly'

  const info = {
    client_type,
    database: PG_NAME,
    user: PG_USER,
    host: PG_HOST || 'localhost',
    port: Number(PG_PORT) || 5432
  }

  await log.info('connecting to postgres:', ...Object.keys(info).map(key => (info as { [x: string]: unknown })[key]))

  const client = configureClient({ ...info, password: PG_PASS })

  try {
    await client.connect()
    if (useWriteable) {
      if (PG_MIGRATIONS === 'true') {
        await updateSchema(client)
      }
    }
    client.setConnected(true)
    return client
  } catch (err) {
    await log.error('postgres connection error', err.stack)
    client.setConnected(false)
    throw err
  }
}

async function getReadOnlyClient(): Promise<MDSPostgresClient> {
  if (readOnlyCachedClient && readOnlyCachedClient.connected) {
    return readOnlyCachedClient
  }

  try {
    readOnlyCachedClient = await setupClient(false)
    return readOnlyCachedClient
  } catch (err) {
    readOnlyCachedClient = null
    await log.error('postgres connection error', err)
    throw err
  }
}

async function getWriteableClient(): Promise<MDSPostgresClient> {
  if (writeableCachedClient && writeableCachedClient.connected) {
    return writeableCachedClient
  }

  try {
    writeableCachedClient = await setupClient(true)
    return writeableCachedClient
  } catch (err) {
    writeableCachedClient = null
    await log.error('postgres connection error', err)
    throw err
  }
}

async function initialize() {
  const client: MDSPostgresClient = await getWriteableClient()
  await dropTables(client)
  await updateSchema(client)
  await getReadOnlyClient()
  return 'postgres'
}

// This should never be exported, to prevent risk of SQL injection.
// Only functions in this module should ever call it.

/* eslint-reason ambigous helper function that wraps a query as Readonly */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
async function makeReadOnlyQuery(sql: string): Promise<any[]> {
  try {
    const client = await getReadOnlyClient()
    await logSql(sql)
    const result = await client.query(sql)
    return result.rows
  } catch (err) {
    await log.error(`error with SQL query ${sql}`, err.stack || err)
    throw err
  }
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

async function readDeviceByVehicleId(
  provider_id: UUID,
  vehicle_id: UUID,
  ...alternate_vehicle_ids: UUID[]
): Promise<Recorded<Device>> {
  const client = await getReadOnlyClient()
  const vehicle_ids = [...new Set([vehicle_id, ...alternate_vehicle_ids])]
  const vals = new SqlVals()
  const sql = `SELECT * FROM ${schema.TABLE.devices} WHERE provider_id=${vals.add(
    provider_id
  )} AND translate(vehicle_id, translate(lower(vehicle_id), 'abcdefghijklmnopqrstuvwxyz1234567890', ''), '') ILIKE ANY(ARRAY[${vehicle_ids
    .map(id => vals.add(id))
    .join(', ')}])`

  const values = vals.values()
  await logSql(sql, values)
  const result = await client.query(sql, values)
  if (result.rows.length === 1) {
    return result.rows[0] as Recorded<Device>
  }
  const error = `device associated with vehicle ${
    vehicle_ids.length === 1 ? vehicle_id : `(${csv(vehicle_ids)})`
  } for provider ${provider_id}: rows=${result.rows.length}`
  await log.warn(error)
  throw Error(error)
}

async function readDeviceIds(provider_id?: UUID, skip?: number, take?: number): Promise<DeviceID[]> {
  // read from pg
  const client = await getReadOnlyClient()
  let sql = `SELECT device_id, provider_id FROM ${schema.TABLE.devices}`
  const vals = new SqlVals()
  if (isUUID(provider_id)) {
    sql += ` WHERE provider_id= ${vals.add(provider_id)}`
  }
  sql += ' ORDER BY recorded'
  if (typeof skip === 'number' && skip >= 0) {
    sql += ` OFFSET ${vals.add(skip)}`
  }
  if (typeof take === 'number' && take >= 0) {
    sql += ` LIMIT ${vals.add(take)}`
  }
  const values = vals.values()
  await logSql(sql, values)
  const res = await client.query(sql, values)
  return res.rows
}

// TODO: FIX updateDevice/readDevice circular reference
async function readDevice(
  device_id: UUID,
  provider_id?: UUID,
  optionalClient?: MDSPostgresClient
): Promise<Recorded<Device>> {
  const client = optionalClient || (await getReadOnlyClient())
  const sql = provider_id
    ? `SELECT * FROM ${schema.TABLE.devices} WHERE device_id=$1 AND provider_id=$2`
    : `SELECT * FROM ${schema.TABLE.devices} WHERE device_id=$1`
  const values = provider_id ? [device_id, provider_id] : [device_id]
  await logSql(sql, values)
  const res = await client.query(sql, values)
  // verify one row
  if (res.rows.length === 1) {
    return res.rows[0]
  }
  await log.info(`readDevice db failed for ${device_id}: rows=${res.rows.length}`)
  throw new Error(`device_id ${device_id} not found`)
}

async function readDeviceList(device_ids: UUID[]): Promise<Recorded<Device>[]> {
  if (device_ids.length === 0) {
    return []
  }
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const sql = `SELECT * FROM ${schema.TABLE.devices} WHERE device_id IN (${device_ids.map(device_id =>
    vals.add(device_id)
  )})`
  const values = vals.values()
  await logSql(sql, values)
  const result = await client.query(sql, values)
  return result.rows
}

async function writeDevice(device: Device): Promise<Recorded<Device>> {
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.devices} (${cols_sql(schema.TABLE_COLUMNS.devices)}) VALUES (${vals_sql(
    schema.TABLE_COLUMNS.devices
  )}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.devices, { ...device, recorded: now() })
  await logSql(sql, values)
  const {
    rows: [recorded_device]
  }: { rows: Recorded<Device>[] } = await client.query(sql, values)
  return { ...device, ...recorded_device }
}

async function updateDevice(device_id: UUID, provider_id: UUID, changes: Partial<Device>): Promise<Device> {
  const client = await getWriteableClient()

  const sql = `UPDATE ${schema.TABLE.devices} SET vehicle_id = $1 WHERE device_id = $2`
  const values = [changes.vehicle_id, device_id]
  await logSql(sql, values)
  const res = await client.query(sql, values)

  if (res.rowCount === 0) {
    throw new Error('not found')
  } else {
    return readDevice(device_id, provider_id)
  }
}

async function writeEvent(event: VehicleEvent) {
  const client = await getWriteableClient()
  await readDevice(event.device_id, event.provider_id, client)
  const telemetry_timestamp = event.telemetry ? event.telemetry.timestamp : null
  const sql = `INSERT INTO ${schema.TABLE.events} (${cols_sql(schema.TABLE_COLUMNS.events)}) VALUES (${vals_sql(
    schema.TABLE_COLUMNS.events
  )}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.events, { ...event, telemetry_timestamp })
  await logSql(sql, values)
  const {
    rows: [recorded_event]
  }: { rows: Recorded<VehicleEvent>[] } = await client.query(sql, values)
  return { ...event, ...recorded_event }
}

async function readEvent(device_id: UUID, timestamp?: Timestamp): Promise<VehicleEvent> {
  // read from pg
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  let sql = `SELECT * FROM ${schema.TABLE.events} WHERE device_id=${vals.add(device_id)}`
  if (timestamp) {
    sql += ` AND "timestamp"=${vals.add(timestamp)}`
  } else {
    sql += ' ORDER BY "timestamp" DESC LIMIT 1'
  }
  const values = vals.values()
  await logSql(sql, values)
  const res = await client.query(sql, values)

  // verify one row
  if (res.rows.length === 1) {
    return res.rows[0]
  }
  log.info(`readEvent failed for ${device_id}:${timestamp || 'latest'}`)
  throw new Error(`event for ${device_id}:${timestamp} not found`)
}

async function readEvents(params: ReadEventsQueryParams): Promise<ReadEventsResult> {
  const { skip, take, start_time, end_time, start_recorded, end_recorded, device_id, trip_id } = params
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const conditions = []

  if (start_time) {
    conditions.push(`"timestamp" >= ${vals.add(start_time)}`)
  }
  if (end_time) {
    conditions.push(`"timestamp" <= ${vals.add(end_time)}`)
  }
  if (start_recorded) {
    conditions.push(`recorded >= ${vals.add(start_recorded)}`)
  }
  if (end_recorded) {
    conditions.push(`recorded <= ${vals.add(end_recorded)}`)
  }
  if (device_id) {
    conditions.push(`device_id = ${vals.add(device_id)}`)
  }
  if (trip_id) {
    conditions.push(`trip_id = ${vals.add(trip_id)}`)
  }

  const filter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const countSql = `SELECT COUNT(*) FROM ${schema.TABLE.events} ${filter}`
  const countVals = vals.values()

  await logSql(countSql, countVals)

  const res = await client.query(countSql, countVals)
  const count = parseInt(res.rows[0].count)
  let selectSql = `SELECT * FROM ${schema.TABLE.events} ${filter} ORDER BY recorded`
  if (typeof skip === 'number' && skip >= 0) {
    selectSql += ` OFFSET ${vals.add(skip)}`
  }
  if (typeof take === 'number' && take >= 0) {
    selectSql += ` LIMIT ${vals.add(take)}`
  }
  const selectVals = vals.values()
  await logSql(selectSql, selectVals)

  const res2 = await client.query(selectSql, selectVals)
  const events = res2.rows
  return {
    events,
    count
  }
}
async function readEventsForStatusChanges(params: ReadEventsQueryParams): Promise<ReadEventsResult> {
  const { skip, take, start_time, end_time, start_recorded, end_recorded, device_id, trip_id } = params
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const conditions = []

  if (start_time) {
    conditions.push(`"timestamp" >= ${vals.add(start_time)}`)
  }
  if (end_time) {
    conditions.push(`"timestamp" <= ${vals.add(end_time)}`)
  }
  if (start_recorded) {
    conditions.push(`recorded >= ${vals.add(start_recorded)}`)
  }
  if (end_recorded) {
    conditions.push(`recorded <= ${vals.add(end_recorded)}`)
  }
  if (device_id) {
    conditions.push(`device_id = ${vals.add(device_id)}`)
  }
  if (trip_id) {
    conditions.push(`trip_id = ${vals.add(trip_id)}`)
  }

  const filter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const countSql = `SELECT COUNT(*) FROM ${schema.TABLE.events} ${filter}`
  const countVals = vals.values()

  await logSql(countSql, countVals)

  const res = await client.query(countSql, countVals)
  const count = parseInt(res.rows[0].count)

  let selectSql = `SELECT E.*, T.lat, T.lng, T.speed, T.heading, T.accuracy, T.altitude, T.charge, T.timestamp AS telemetry_timestamp FROM (SELECT * FROM ${schema.TABLE.events} ${filter} ORDER BY recorded`
  if (typeof skip === 'number' && skip >= 0) {
    selectSql += ` OFFSET ${vals.add(skip)}`
  }
  if (typeof take === 'number' && take >= 0) {
    selectSql += ` LIMIT ${vals.add(take)}`
  }
  selectSql += `) AS E LEFT JOIN ${schema.TABLE.telemetry} T ON E.device_id = T.device_id AND CASE WHEN E.telemetry_timestamp IS NULL THEN E.timestamp ELSE E.telemetry_timestamp END = T.timestamp ORDER BY recorded`
  const selectVals = vals.values()
  await logSql(selectSql, selectVals)
  const res2 = await client.query(selectSql, selectVals)
  return {
    events: res2.rows.map(
      ({ lat, lng, speed, heading, accuracy, altitude, charge, telemetry_timestamp, ...event }) => ({
        ...event,
        telemetry: telemetry_timestamp
          ? {
              timestamp: telemetry_timestamp,
              gps: { lat, lng, speed, heading, accuracy, altitude },
              charge
            }
          : null
      })
    ),
    count
  }
}

async function readHistoricalEvents(params: ReadHistoricalEventsQueryParams) {
  const { provider_id: query_provider_id, end_date } = params
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const values = vals.values()
  let sql = `SELECT      e2.provider_id,
  e2.device_id,
  e2.event_type,
  e2.timestamp,
  lat,
  lng,
  speed,
  heading,
  accuracy,
  altitude,
  recorded
FROM
(
SELECT      provider_id,
      device_id,
      event_type,
      timestamp
FROM
(
SELECT      provider_id,
          device_id,
          event_type,
          timestamp,
          recorded,
          RANK() OVER (PARTITION BY device_id ORDER BY timestamp DESC) AS rownum
FROM        events
WHERE         timestamp < '${end_date}'`
  if (query_provider_id) {
    sql += `\nAND         provider_id = '${query_provider_id}'`
  }
  sql += `) e1
  WHERE       rownum = 1
  AND         event_type IN ('trip_enter',
                       'trip_start',
                       'trip_end',
                       'reserve',
                       'cancel_reservation',
                       'provider_drop_off',
                       'service_end',
                       'service_start')
  ) e2
  INNER JOIN  telemetry
  ON          e2.device_id = telemetry.device_id
  AND         e2.timestamp = telemetry.timestamp
  ORDER BY    provider_id,
    device_id,
    event_type`

  const { rows } = await client.query(sql, values)
  const events = rows.reduce((acc: VehicleEvent[], row) => {
    const {
      provider_id,
      device_id,
      event_type,
      timestamp,
      recorded,
      lat,
      lng,
      speed,
      heading,
      accuracy,
      altitude
    } = row
    return [
      ...acc,
      {
        provider_id,
        device_id,
        event_type,
        timestamp,
        recorded,
        telemetry: {
          provider_id,
          device_id,
          timestamp,
          gps: {
            lat,
            lng,
            speed,
            heading,
            accuracy,
            altitude
          }
        }
      }
    ]
  }, [])
  return events
}

async function readTripList(trip_ids: UUID[]) {
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const sql = `SELECT * FROM ${schema.TABLE.trips} WHERE provider_trip_id IN (${trip_ids.map(trip_id =>
    vals.add(trip_id)
  )})`
  const values = vals.values()
  await logSql(sql, values)
  const result = await client.query(sql, values)
  return result.rows
}

async function updateTrip(provider_trip_id: UUID, trip: Partial<Trip>) {
  const client = await getWriteableClient()
  const vals = new SqlVals()
  const sql = `UPDATE ${schema.TABLE.trips} SET ${Object.keys(trip)
    .filter(col => col !== schema.COLUMN.id)
    .map(key => `${key} = ${vals.add(trip[key as keyof Trip] as string)}`)
    .join(', ')} WHERE provider_trip_id = ${vals.add(provider_trip_id)}`
  const values = vals.values()
  await logSql(sql, values)
  const result = await client.query(sql, values)
  return result.rowCount
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

async function getEventCountsPerProviderSince(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: UUID; event_type: string; count: number; slacount: number }[]> {
  const thirty_sec = seconds(30)
  const sql = `select provider_id, event_type, count(*), count(case when (recorded-timestamp) > ${thirty_sec} then 1 else null end) as slacount from events where recorded > ${start} and recorded < ${stop} group by provider_id, event_type`
  return makeReadOnlyQuery(sql)
}

async function getEventsLast24HoursPerProvider(start = yesterday(), stop = now()): Promise<VehicleEvent[]> {
  const sql = `select provider_id, device_id, event_type, recorded, timestamp from ${schema.TABLE.events} where recorded > ${start} and recorded < ${stop} order by "timestamp" ASC`
  return makeReadOnlyQuery(sql)
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

async function getNumEventsLast24HoursByProvider(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: UUID; count: number }[]> {
  const sql = `select provider_id, count(*) from ${schema.TABLE.events} where recorded > ${start} and recorded < ${stop} group by provider_id`
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

async function readAudit(audit_trip_id: UUID) {
  const client = await getReadOnlyClient()
  const sql = `SELECT * FROM ${schema.TABLE.audits} WHERE deleted IS NULL AND audit_trip_id=$1`
  const values = [audit_trip_id]
  await logSql(sql, values)
  const result = await client.query(sql, values)
  if (result.rows.length === 1) {
    return result.rows[0]
  }
  const error = `readAudit db failed for ${audit_trip_id}: rows=${result.rows.length}`
  await log.warn(error)
  throw new Error(error)
}

async function readAudits(query: ReadAuditsQueryParams) {
  const client = await getReadOnlyClient()

  const { skip, take, provider_id, provider_vehicle_id, audit_subject_id, start_time, end_time } = query

  const vals = new SqlVals()

  const conditions = [
    `deleted IS NULL`,
    ...(provider_id ? [`provider_id = ${vals.add(provider_id)}`] : []),
    ...(provider_vehicle_id ? [`provider_vehicle_id ILIKE ${vals.add(`%${provider_vehicle_id}%`)}`] : []),
    ...(audit_subject_id ? [`audit_subject_id ILIKE ${vals.add(`%${audit_subject_id}%`)}`] : []),
    ...(start_time ? [`timestamp >= ${vals.add(start_time)}`] : []),
    ...(end_time ? [`timestamp <= ${vals.add(end_time)}`] : [])
  ]

  try {
    const filter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const countSql = `SELECT COUNT(*) FROM ${schema.TABLE.audits} ${filter}`
    const countVals = vals.values()
    await logSql(countSql, countVals)
    const countResult = await client.query(countSql, countVals)
    const count = parseInt(countResult.rows[0].count)
    if (count === 0) {
      return {
        count,
        audits: []
      }
    }
    const selectSql = `SELECT * FROM ${schema.TABLE.audits} ${filter} ORDER BY "timestamp" DESC${
      typeof skip === 'number' && skip >= 0 ? ` OFFSET ${vals.add(skip)}` : ''
    }${typeof take === 'number' && take >= 0 ? ` LIMIT ${vals.add(take)}` : ''}`
    const selectVals = vals.values()
    await logSql(selectSql, selectVals)
    const selectResult = await client.query(selectSql, selectVals)
    return {
      count,
      audits: selectResult.rows
    }
  } catch (err) {
    await log.error('readAudits error', err.stack || err)
    throw err
  }
}

async function writeAudit(audit: Audit): Promise<Recorded<Audit>> {
  // write pg
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.audits} (${cols_sql(schema.TABLE_COLUMNS.audits)}) VALUES (${vals_sql(
    schema.TABLE_COLUMNS.audits
  )}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.audits, { ...audit, recorded: now() })
  await logSql(sql, values)
  const {
    rows: [recorded_audit]
  }: { rows: Recorded<Audit>[] } = await client.query(sql, values)
  return { ...audit, ...recorded_audit }
}

async function deleteAudit(audit_trip_id: UUID) {
  const client = await getWriteableClient()
  const sql = `UPDATE ${schema.TABLE.audits} SET deleted=$1 WHERE audit_trip_id=$2 AND deleted IS NULL`
  const values = [now(), audit_trip_id]
  await logSql(sql, values)
  const result = await client.query(sql, values)
  return result.rowCount
}

async function readAuditEvents(audit_trip_id: UUID): Promise<Recorded<AuditEvent>[]> {
  try {
    const client = await getReadOnlyClient()
    const vals = new SqlVals()
    const sql = `SELECT * FROM ${schema.TABLE.audit_events} WHERE audit_trip_id=${vals.add(
      audit_trip_id
    )} ORDER BY "timestamp"`
    const sqlVals = vals.values()
    await logSql(sql, sqlVals)
    const result = await client.query(sql, sqlVals)
    return result.rows
  } catch (err) {
    await log.error('readAuditEvents error', err.stack || err)
    throw err
  }
}

async function writeAuditEvent(audit_event: AuditEvent): Promise<Recorded<AuditEvent>> {
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.audit_events} (${cols_sql(
    schema.TABLE_COLUMNS.audit_events
  )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.audit_events)}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.audit_events, { ...audit_event, recorded: now() })
  await logSql(sql, values)
  const {
    rows: [recorded_audit_event]
  }: { rows: Recorded<AuditEvent>[] } = await client.query(sql, values)
  return { ...audit_event, ...recorded_audit_event }
}

async function writeTrips(trips: Trip[]): Promise<Recorded<Trip>[]> {
  if (trips.length === 0) {
    throw new Error('writeTrips: zero trips')
  }
  try {
    const client = await getWriteableClient()
    const recorded = now()

    const values = csv(
      trips
        .map(trip =>
          csv(vals_list(schema.TABLE_COLUMNS.trips, { ...trip, recorded: trip.recorded || recorded }).map(to_sql))
        )
        .map(row => `(${row})`)
    )

    const sql = `INSERT INTO ${schema.TABLE.trips} (${cols_sql(
      schema.TABLE_COLUMNS.trips
    )}) VALUES ${values} ON CONFLICT DO NOTHING RETURNING *`

    await logSql(sql)
    const { rows: recorded_trips }: { rows: Recorded<Trip>[] } = await client.query(sql)
    return recorded_trips.map(recorded_trip => ({
      ...trips.find(trip => trip.provider_trip_id === recorded_trip.provider_trip_id),
      ...recorded_trip
    }))
  } catch (err) {
    await log.error('pg writeTrips error', err)
    throw err
  }
}

async function readTrips(
  params: Partial<{
    skip: number
    take: number
    provider_id: UUID
    device_id: UUID
    vehicle_id: string
    min_end_time: Timestamp
    max_end_time: Timestamp
  }>
): Promise<ReadTripsResult> {
  const client = await getReadOnlyClient()
  const { device_id, vehicle_id, provider_id, min_end_time, max_end_time, skip, take } = params

  const vals = new SqlVals()
  const conditions: string[] = ['trip_start IS NOT NULL', 'trip_end IS NOT NULL']

  if (device_id) {
    if (!isUUID(device_id)) {
      throw new Error(`invalid device_id ${device_id}`)
    } else {
      conditions.push(`device_id = ${vals.add(device_id)}`)
    }
  }

  if (provider_id) {
    if (!isUUID(provider_id)) {
      throw new Error(`invalid provider_id ${provider_id}`)
    } else {
      conditions.push(`provider_id = ${vals.add(provider_id)}`)
    }
  }

  if (vehicle_id) {
    conditions.push(`vehicle_id = ${vals.add(vehicle_id)}`)
  }

  if (min_end_time !== undefined) {
    if (!isTimestamp(min_end_time)) {
      throw new Error(`invalid min_end_time ${min_end_time}`)
    } else {
      conditions.push(`trip_end >= ${vals.add(min_end_time)}`)
    }
  }

  if (max_end_time !== undefined) {
    if (!isTimestamp(max_end_time)) {
      throw new Error(`invalid max_end_time ${max_end_time}`)
    } else {
      conditions.push(`trip_end <= ${vals.add(max_end_time)}`) // FIXME confirm <=
    }
  }

  const where = conditions.length === 0 ? '' : ` WHERE ${conditions.join(' AND ')}`

  const exec = SqlExecuter(client)

  const {
    rows: [{ count }]
  } = await exec(`SELECT COUNT(*) FROM ${schema.TABLE.trips} ${where}`, vals.values())

  if (count === 0) {
    return { count, trips: [] }
  }

  const { rows: trips } = await exec(
    `SELECT * FROM ${schema.TABLE.trips} ${where} ORDER BY id${skip ? ` OFFSET ${vals.add(skip)}` : ''}${
      take ? ` LIMIT ${vals.add(take)}` : ''
    }`,
    vals.values()
  )

  return { count, trips }
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

async function readSingleGeography(geography_id: UUID): Promise<Geography> {
  try {
    const client = await getReadOnlyClient()

    const sql = `select * from ${schema.TABLE.geographies} where geography_id = '${geography_id}'`
    const { rows } = await client.query(sql)

    const { id, ...geography } = rows[0]
    return geography
  } catch (err) {
    await log.error('readSingleGeography', err)
    throw new NotFoundError(`could not find geography ${geography_id}`)
  }
}

async function readGeographies(params?: { get_read_only?: boolean }): Promise<Geography[]> {
  // use params to filter
  // query on ids
  // return geographies
  try {
    const client = await getReadOnlyClient()

    let sql = `select * from ${schema.TABLE.geographies}`
    const conditions = []
    const vals = new SqlVals()

    if (params && params.get_read_only) {
      conditions.push(`read_only IS TRUE`)
    }

    if (conditions.length) {
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    const values = vals.values()
    // TODO insufficiently general
    // TODO add 'count'
    const { rows } = await client.query(sql, values)

    return rows.map(row => {
      const { id, ...geography } = row
      return geography
    })
  } catch (err) {
    await log.error('readGeographies', err)
    throw err
  }
}

async function readBulkGeographyMetadata(params?: { get_read_only?: boolean }): Promise<GeographyMetadata[]> {
  const geographies = await readGeographies(params)
  const geography_ids = geographies.map(geography => {
    return `'${geography.geography_id}'`
  })

  if (geography_ids.length === 0) {
    return []
  }
  const sql = `select * from ${schema.TABLE.geography_metadata} where geography_id in (${geography_ids.join(',')})`

  const client = await getReadOnlyClient()
  const res = await client.query(sql)
  return res.rows.map(row => {
    return { geography_id: row.geography_id, geography_metadata: row.geography_metadata }
  })
}

async function writeGeography(geography: Geography): Promise<Recorded<Geography>> {
  // validate TODO
  // write
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.geographies} (${cols_sql(
    schema.TABLE_COLUMNS.geographies
  )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.geographies)}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.geographies, { ...geography })
  const {
    rows: [recorded_geography]
  }: { rows: Recorded<Geography>[] } = await client.query(sql, values)
  return { ...geography, ...recorded_geography }
}

async function isGeographyPublished(geography_id: UUID) {
  const client = await getReadOnlyClient()
  const sql = `SELECT * FROM ${schema.TABLE.geographies} WHERE geography_id='${geography_id}'`
  const result = await client.query(sql).catch(err => {
    throw err
  })
  if (result.rows.length === 0) {
    throw new NotFoundError(`geography_id ${geography_id} not found`)
  }
  log.info('is geography published', geography_id, result.rows[0].read_only)
  return Boolean(result.rows[0].read_only)
}

async function editGeography(geography: Geography) {
  // validate TODO
  if (await isGeographyPublished(geography.geography_id)) {
    throw new Error('Cannot edit published Geography')
  }

  const client = await getWriteableClient()
  const sql = `UPDATE ${schema.TABLE.geographies} SET geography_json=$1 WHERE geography_id='${geography.geography_id}' AND read_only IS FALSE`
  await client.query(sql, [geography.geography_json])
  return geography
}

async function deleteGeography(geography_id: UUID) {
  if (await isGeographyPublished(geography_id)) {
    throw new Error('Cannot edit published Geography')
  }

  const client = await getWriteableClient()
  const sql = `DELETE FROM ${schema.TABLE.geographies} WHERE geography_id='${geography_id}' AND read_only IS FALSE`
  await client.query(sql)
  return geography_id
}

async function publishGeography(params: { geography_id: UUID; effective_date: Timestamp }) {
  try {
    const client = await getWriteableClient()
    const geography = await readSingleGeography(params.geography_id)
    if (!geography) {
      throw new NotFoundError('cannot publish nonexistent geography')
    }
    // set publish_date to now() if it isn't there already
    // set effective_date to the provided param if it is earlier than what is already there
    const vals = new SqlVals()
    const conditions = []

    if (!geography.read_only) {
      conditions.push(`read_only = ${vals.add('t')}`)
    }

    if (!geography.publish_date) {
      conditions.push(`publish_date = ${vals.add(now())}`)
    }

    if (!geography.effective_date || geography.effective_date > params.effective_date) {
      conditions.push(`effective_date = ${vals.add(params.effective_date)}`)
    }

    conditions.join(',')

    if (conditions.length > 0) {
      const sql = `UPDATE ${schema.TABLE.geographies} SET ${conditions} where geography_id='${params.geography_id}'`
      await client.query(sql, vals.values())
    }
    return params.geography_id
  } catch (err) {
    await log.error(err)
    throw err
  }
}

async function writeGeographyMetadata(geography_metadata: GeographyMetadata) {
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.geography_metadata} (${cols_sql(
    schema.TABLE_COLUMNS.geography_metadata
  )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.geography_metadata)}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.geography_metadata, {
    geography_id: geography_metadata.geography_id,
    geography_metadata: geography_metadata.geography_metadata
  })
  const {
    rows: [recorded_metadata]
  }: { rows: Recorded<Geography>[] } = await client.query(sql, values)
  return { ...geography_metadata, ...recorded_metadata }
}

async function readSingleGeographyMetadata(geography_id: UUID): Promise<GeographyMetadata> {
  const client = await getReadOnlyClient()
  const sql = `SELECT * FROM ${schema.TABLE.geography_metadata} WHERE geography_id = '${geography_id}'`
  const result = await client.query(sql)
  if (result.rows.length === 0) {
    throw new NotFoundError(`Metadata for ${geography_id} not found`)
  }
  return { geography_id, geography_metadata: result.rows[0].geography_metadata }
}

async function updateGeographyMetadata(geography_metadata: GeographyMetadata) {
  await readSingleGeographyMetadata(geography_metadata.geography_id)
  const client = await getWriteableClient()
  const sql = `UPDATE ${schema.TABLE.geography_metadata}
    SET geography_metadata = '${JSON.stringify(geography_metadata.geography_metadata)}'
    WHERE geography_id = '${geography_metadata.geography_id}'`
  const {
    rows: [recorded_metadata]
  }: { rows: Recorded<GeographyMetadata>[] } = await client.query(sql)
  return {
    ...geography_metadata,
    ...recorded_metadata
  }
}

async function readPolicies(params?: {
  policy_id?: UUID
  name?: string
  description?: string
  start_date?: Timestamp
  get_unpublished?: boolean
  get_published?: boolean
}): Promise<Policy[]> {
  // use params to filter
  // query
  // return policies
  const client = await getReadOnlyClient()

  // TODO more params
  let sql = `select * from ${schema.TABLE.policies}`
  const conditions = []
  const vals = new SqlVals()
  if (params) {
    if (params.policy_id) {
      conditions.push(`policy_id = ${vals.add(params.policy_id)}`)
    }

    if (params.get_unpublished) {
      conditions.push(`policy_json->>'publish_date' IS NULL`)
    }

    if (params.get_published) {
      conditions.push(`policy_json->>'publish_date' IS NOT NULL`)
    }

    if (params.get_unpublished && params.get_published) {
      throw new BadParamsError('cannot have get_unpublished and get_published both be true')
    }

    if (params.start_date) {
      conditions.push(`policy_json->>'start_date' >= '${params.start_date}'`)
    }
  }

  if (conditions.length) {
    sql += ` WHERE ${conditions.join(' AND ')}`
  }
  const values = vals.values()
  const res = await client.query(sql, values)
  return res.rows.map(row => row.policy_json)
}

async function readBulkPolicyMetadata(params?: {
  policy_id?: UUID
  name?: string
  description?: string
  start_date?: Timestamp
  get_unpublished?: boolean
  get_published?: boolean
}): Promise<PolicyMetadata[]> {
  const policies = await readPolicies(params)
  const policy_ids = policies.map(policy => {
    return `'${policy.policy_id}'`
  })

  if (policy_ids.length === 0) {
    return []
  }
  const sql = `select * from ${schema.TABLE.policy_metadata} where policy_id in (${policy_ids.join(',')})`

  const client = await getReadOnlyClient()
  const res = await client.query(sql)
  return res.rows.map(row => {
    return { policy_id: row.policy_id, policy_metadata: row.policy_metadata }
  })
}

async function readSinglePolicyMetadata(policy_id: UUID): Promise<PolicyMetadata> {
  const client = await getReadOnlyClient()

  const sql = `select * from ${schema.TABLE.policy_metadata} where policy_id = '${policy_id}'`
  const res = await client.query(sql)
  if (res.rows.length === 1) {
    const { policy_metadata } = res.rows[0]
    return { policy_id, policy_metadata }
  }
  await log.info(`readSinglePolicyMetadata db failed for ${policy_id}: rows=${res.rows.length}`)
  throw new NotFoundError(`metadata for policy_id ${policy_id} not found`)
}

async function readPolicy(policy_id: UUID): Promise<Policy> {
  const client = await getReadOnlyClient()

  const sql = `select * from ${schema.TABLE.policies} where policy_id = '${policy_id}'`
  const res = await client.query(sql)
  if (res.rows.length === 1) {
    return res.rows[0].policy_json
  }
  await log.info(`readPolicy db failed for ${policy_id}: rows=${res.rows.length}`)
  throw new NotFoundError(`policy_id ${policy_id} not found`)
}

async function writePolicy(policy: Policy): Promise<Recorded<Policy>> {
  // validate TODO
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.policies} (${cols_sql(schema.TABLE_COLUMNS.policies)}) VALUES (${vals_sql(
    schema.TABLE_COLUMNS.policies
  )}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.policies, { ...policy, policy_json: policy })
  const {
    rows: [recorded_policy]
  }: { rows: Recorded<Policy>[] } = await client.query(sql, values)
  return { ...policy, ...recorded_policy }
}

async function isPolicyPublished(policy_id: UUID) {
  const client = await getReadOnlyClient()
  const sql = `SELECT * FROM ${schema.TABLE.policies} WHERE policy_id='${policy_id}'`
  const result = await client.query(sql)
  if (result.rows.length === 0) {
    return false
  }
  return Boolean(result.rows[0].policy_json.publish_date)
}

async function editPolicy(policy: Policy) {
  // validate TODO
  const { policy_id } = policy

  if (await isPolicyPublished(policy_id)) {
    throw new AlreadyPublishedError('Cannot edit published policy')
  }

  const result = await readPolicies({ policy_id, get_unpublished: true })
  if (result.length === 0) {
    throw new NotFoundError(`no policy of id ${policy_id} was found`)
  }

  const client = await getWriteableClient()
  const sql = `UPDATE ${schema.TABLE.policies} SET policy_json=$1 WHERE policy_id='${policy_id}' AND policy_json->>'publish_date' IS NULL`
  await client.query(sql, [policy])
  return policy
}

async function deletePolicy(policy_id: UUID) {
  if (await isPolicyPublished(policy_id)) {
    throw new Error('Cannot edit published Geography')
  }

  const client = await getWriteableClient()
  const sql = `DELETE FROM ${schema.TABLE.policies} WHERE policy_id='${policy_id}' AND policy_json->>'publish_date' IS NULL`
  await client.query(sql)
  return policy_id
}

async function publishPolicy(policy_id: UUID) {
  try {
    const client = await getWriteableClient()
    if (await isPolicyPublished(policy_id)) {
      throw new AlreadyPublishedError('Cannot re-publish existing policy')
    }

    const policy = (await readPolicies({ policy_id, get_unpublished: true }))[0]
    if (!policy) {
      throw new NotFoundError('cannot publish nonexistent policy')
    }

    const geographies: UUID[] = []
    policy.rules.forEach(rule => {
      rule.geographies.forEach(geography_id => {
        geographies.push(geography_id)
      })
    })
    await Promise.all(
      geographies.map(geography_id => {
        log.info('publishing geography', geography_id)
        return publishGeography({ geography_id, effective_date: policy.start_date })
      })
    )
    await Promise.all(
      geographies.map(geography_id => {
        const ispublished = isGeographyPublished(geography_id)
        log.info('published geography', geography_id, ispublished)
      })
    )

    // Only publish the policy if the geographies are successfully published first
    const publishPolicySQL = `UPDATE ${
      schema.TABLE.policies
    } SET policy_json = policy_json::jsonb || '{"publish_date": ${now()}}' where policy_id='${policy_id}'`
    await client.query(publishPolicySQL).catch(err => {
      throw err
    })
    return policy_id
  } catch (err) {
    await log.error(err)
    throw err
  }
}

async function writePolicyMetadata(policy_metadata: PolicyMetadata) {
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.policy_metadata} (${cols_sql(
    schema.TABLE_COLUMNS.policy_metadata
  )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.policy_metadata)}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.policy_metadata, {
    policy_id: policy_metadata.policy_id,
    policy_metadata: policy_metadata.policy_metadata
  })
  const {
    rows: [recorded_metadata]
  }: { rows: Recorded<PolicyMetadata>[] } = await client.query(sql, values)
  return {
    ...policy_metadata,
    ...recorded_metadata
  }
}

async function updatePolicyMetadata(policy_metadata: PolicyMetadata) {
  try {
    await readSinglePolicyMetadata(policy_metadata.policy_id)
    const client = await getWriteableClient()
    const sql = `UPDATE ${schema.TABLE.policy_metadata}
      SET policy_metadata = '${JSON.stringify(policy_metadata.policy_metadata)}'
      WHERE policy_id = '${policy_metadata.policy_id}'`
    const {
      rows: [recorded_metadata]
    }: { rows: Recorded<PolicyMetadata>[] } = await client.query(sql)
    return {
      ...policy_metadata,
      ...recorded_metadata
    }
  } catch (err) {
    await log.error(err)
    throw err
  }
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

async function readEventsWithTelemetry({
  device_id,
  provider_id,
  start_time,
  end_time,
  last_id = 0,
  limit = 1000
}: Partial<{
  device_id: UUID
  provider_id: UUID
  start_time: Timestamp
  end_time: Timestamp
  last_id: number
  limit: number
}>): Promise<Recorded<VehicleEvent>[]> {
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const exec = SqlExecuter(client)

  const conditions: string[] = last_id ? [`id > ${vals.add(last_id)}`] : []

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
      conditions.push(`timestamp >= ${vals.add(start_time)}`)
    }
  }

  if (end_time !== undefined) {
    if (!isTimestamp(end_time)) {
      throw new Error(`invalid end_time ${end_time}`)
    } else {
      conditions.push(`timestamp <= ${vals.add(end_time)}`)
    }
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await exec(
    `SELECT E.*, T.lat, T.lng, T.speed, T.heading, T.accuracy, T.altitude, T.charge, T.timestamp AS telemetry_timestamp FROM (SELECT * FROM ${
      schema.TABLE.events
    }${where} ORDER BY id LIMIT ${vals.add(limit)}
    ) AS E LEFT JOIN ${
      schema.TABLE.telemetry
    } T ON E.device_id = T.device_id AND CASE WHEN E.telemetry_timestamp IS NULL THEN E.timestamp ELSE E.telemetry_timestamp END = T.timestamp ORDER BY id`,
    vals.values()
  )

  return rows.map(({ lat, lng, speed, heading, accuracy, altitude, charge, telemetry_timestamp, ...event }) => ({
    ...event,
    telemetry: telemetry_timestamp
      ? {
          timestamp: telemetry_timestamp,
          gps: { lat, lng, speed, heading, accuracy, altitude },
          charge
        }
      : null
  }))
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
