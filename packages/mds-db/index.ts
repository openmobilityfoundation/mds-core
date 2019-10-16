import { VehicleEvent, Device, Telemetry } from '@mds-core/mds-types'
import log from '@mds-core/mds-logger'

import { dropTables, updateSchema } from './migration'
import { MDSPostgresClient } from './sql-utils'
import { getReadOnlyClient, getWriteableClient, makeReadOnlyQuery } from './client'

import {
<<<<<<< HEAD
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
import { TABLE_NAME } from './schema'

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
=======
  readDeviceByVehicleId,
  readDeviceIds,
  readDevice,
  readDeviceList,
  writeDevice,
  updateDevice,
  wipeDevice,
  getVehicleCountsPerProvider,
  getNumVehiclesRegisteredLast24HoursByProvider
} from './devices'
>>>>>>> develop

import {
  writeEvent,
  readEvent,
  readEvents,
  readEventsForStatusChanges,
  readHistoricalEvents,
  getEventCountsPerProviderSince,
  getEventsLast24HoursPerProvider,
  getNumEventsLast24HoursByProvider,
  getMostRecentEventByProvider,
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
  readRule,
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

import {
  writeTrips,
  updateTrip,
  readTrips,
  readTripList,
  readTripIds,
  getLatestTripTime,
  getTripEventsLast24HoursByProvider,
  getTripCountsPerProviderSince
} from './trips'

import {
  readTelemetry,
  writeTelemetry,
  getTelemetryCountsPerProviderSince,
  getMostRecentTelemetryByProvider
} from './telemetry'

import {
  writeStatusChanges,
  readStatusChanges,
  readUnprocessedStatusChangeEvents,
  getLatestStatusChangeTime
} from './status_changes'

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

<<<<<<< HEAD
function commaize(array: any[], quote = `'`, join = ','): any {
  return array.map((val: any) => `${stringify(val, quote)}`).join(join)
}

function db_time(time: any): any {
  let date_time = parseInt(time) ? parseInt(time) : time
  return (
    new Date(date_time)
      .toISOString()
      .replace('T', ' ')
      .substr(0, 23) + 'UTC'
  )
}

function stringify(data: any, quote: any, nested = false): any {
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

    let commaized_content = commaize(data.map(data_element => stringify(data_element, `'`, true)), ``)
    let cast = !nested && type !== '[]'
    return `${cast ? 'CAST(' : ''}${nested ? '' : 'ARRAY'}[${commaized_content}]${cast ? ` AS ${type})` : ''}`
  } else if (typeof data === 'object') {
    return `${quote}${JSON.stringify(data)}${quote}`
  } else {
    return `${quote}${data}${quote}`
  }
}

async function runQuery(query: any) {
  const client = await getWriteableClient()
  let results = await client.query(query)
  return results.rows
}

async function insert(table_name: TABLE_NAME, data: { [x: string]: any }) {
  if (!data) {
    return null
  }
  let fields = Object.keys(schema.TABLE[table_name])
  let query = `INSERT INTO ${table_name} (${commaize(fields, `"`)}) `
  log.info(commaize(fields.map(field => (field.includes('time') ? db_time(data[field]) : data[field]))))
  query += `VALUES (${commaize(fields.map(field => (field.includes('time') ? db_time(data[field]) : data[field])))})`
  console.log(query)
  return runQuery(query)
}

async function resetTable(table_name: TABLE_NAME) {
  await runQuery(`TRUNCATE ${table_name}`)
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

=======
>>>>>>> develop
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
  insert,
  resetTable,
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
