/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { VehicleEvent, Device, UUID, Timestamp, Recorded } from '@mds-core/mds-types'
import { now, isUUID, isTimestamp, seconds, yesterday } from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'
import { ReadEventsResult, ReadEventsQueryParams, ReadHistoricalEventsQueryParams } from './types'

import schema from './schema'

import { vals_sql, cols_sql, vals_list, logSql, SqlVals, SqlExecuter } from './sql-utils'

import { readDevice } from './devices'
import { getReadOnlyClient, getWriteableClient, makeReadOnlyQuery } from './client'

export async function writeEvent(event: VehicleEvent) {
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

export async function readEvent(device_id: UUID, timestamp?: Timestamp): Promise<Recorded<VehicleEvent>> {
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
  logger.info(`readEvent failed for ${device_id}:${timestamp || 'latest'}`)
  throw new Error(`event for ${device_id}:${timestamp} not found`)
}

export async function readEvents(params: ReadEventsQueryParams): Promise<ReadEventsResult> {
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

export interface TripEvents {
  [trip_id: string]: VehicleEvent[]
}

export interface TripEventsResult {
  trips: TripEvents
  tripCount: number
}

/**
 * @param ReadEventsQueryParams skip/take paginates on trip_id
 */
export async function readTripEvents(params: ReadEventsQueryParams): Promise<TripEventsResult> {
  const { skip, take, start_time, end_time } = params
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const conditions = []

  if (start_time) {
    conditions.push(`e."timestamp" >= ${vals.add(start_time)}`)
  }
  if (end_time) {
    conditions.push(`e."timestamp" <= ${vals.add(end_time)}`)
  }

  conditions.push('e.trip_id is not null')

  const filter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const countSql = `SELECT COUNT(DISTINCT(trip_id)) FROM ${schema.TABLE.events} e ${filter}`
  const countVals = vals.values()

  await logSql(countSql, countVals)

  const res = await client.query(countSql, countVals)
  const tripCount = parseInt(res.rows[0].count)

  if (typeof skip === 'number' && skip >= 0) {
    conditions.push(` e.trip_id > ${vals.add(skip)}`)
  }
  const queryFilter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  let selectSql = `select et.trip_id, array_agg(row_to_json(et.*) order by best_timestamp) as events
    FROM
      (SELECT e.*, to_json(t.*) as telemetry, COALESCE(e.telemetry_timestamp, e.timestamp) as best_timestamp
      FROM ${schema.TABLE.events} e
      LEFT JOIN ${schema.TABLE.telemetry} t ON e.device_id = t.device_id
        AND COALESCE(e.telemetry_timestamp, e.timestamp) = t.timestamp
      ${queryFilter}
      order by trip_id
      ) et
    GROUP BY et.trip_id
    ORDER BY et.trip_id`

  if (typeof take === 'number' && take >= 0) {
    selectSql += ` LIMIT ${vals.add(take)}`
  }
  const selectVals = vals.values()
  await logSql(selectSql, selectVals)

  const res2 = await client.query(selectSql, selectVals)

  const trips = Object.values(res2.rows).reduce(
    (acc: TripEvents, { trip_id, events }) => Object.assign(acc, { [trip_id]: events as VehicleEvent }),
    {}
  )

  return {
    trips,
    tripCount
  }
}

export async function readHistoricalEvents(params: ReadHistoricalEventsQueryParams): Promise<VehicleEvent[]> {
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

export async function getEventCountsPerProviderSince(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: UUID; event_type: string; count: number; slacount: number }[]> {
  const thirty_sec = seconds(30)
  const vals = new SqlVals()
  const sql = `select provider_id, event_type, count(*), count(case when (recorded-timestamp) > ${vals.add(
    thirty_sec
  )} then 1 else null end) as slacount from events where recorded > ${vals.add(start)} and recorded < ${vals.add(
    stop
  )} group by provider_id, event_type`
  return makeReadOnlyQuery(sql, vals)
}

export async function getEventsLast24HoursPerProvider(start = yesterday(), stop = now()): Promise<VehicleEvent[]> {
  const vals = new SqlVals()
  const sql = `select provider_id, device_id, event_type, recorded, timestamp from ${
    schema.TABLE.events
  } where recorded > ${vals.add(start)} and recorded < ${vals.add(stop)} order by "timestamp" ASC`
  return makeReadOnlyQuery(sql, vals)
}

export async function getNumEventsLast24HoursByProvider(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: UUID; count: number }[]> {
  const vals = new SqlVals()
  const sql = `select provider_id, count(*) from ${schema.TABLE.events} where recorded > ${vals.add(
    start
  )} and recorded < ${vals.add(stop)} group by provider_id`
  return makeReadOnlyQuery(sql, vals)
}
export async function readEventsWithTelemetry({
  device_id,
  provider_id,
  start_time,
  end_time,
  order_by = 'id',
  last_id = 0,
  limit = 1000
}: Partial<{
  device_id: UUID
  provider_id: UUID
  start_time: Timestamp
  end_time: Timestamp
  order_by: string
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

  // we can only select based on event criteria
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await exec(
    `SELECT E.*, T.lat, T.lng, T.speed, T.heading, T.accuracy, T.altitude, T.charge, T.timestamp AS telemetry_timestamp
      FROM (SELECT * FROM ${schema.TABLE.events}${where} ORDER BY ${order_by} LIMIT ${vals.add(limit)}) AS E
    LEFT JOIN ${schema.TABLE.telemetry} T ON E.device_id = T.device_id
      AND CASE WHEN E.telemetry_timestamp IS NULL THEN E.timestamp ELSE E.telemetry_timestamp END = T.timestamp
    ORDER BY ${order_by}`,
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

// TODO: remove
// heinous copypasta specifically to provide the VIN with every event, used ONLY by Native.
// this is to be excised when we dump Native in the garbage in the 1.0 timeframe.
export async function readEventsWithTelemetryAndVehicleId({
  device_id,
  provider_id,
  start_time,
  end_time,
  order_by = 'id',
  last_id = 0,
  limit = 1000
}: Partial<{
  device_id: UUID
  provider_id: UUID
  start_time: Timestamp
  end_time: Timestamp
  order_by: string
  last_id: number
  limit: number
}>): Promise<Recorded<VehicleEvent & Pick<Device, 'vehicle_id'>>[]> {
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

  // we can only select based on event criteria
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await exec(
    `SELECT E.*, D.vehicle_id, T.lat, T.lng, T.speed, T.heading, T.accuracy, T.altitude, T.charge, T.timestamp AS telemetry_timestamp
      FROM (SELECT * FROM ${schema.TABLE.events}${where} ORDER BY ${order_by} LIMIT ${vals.add(limit)}) AS E
    LEFT JOIN ${schema.TABLE.devices} D ON E.device_id = D.device_id
    LEFT JOIN ${schema.TABLE.telemetry} T ON E.device_id = T.device_id
      AND CASE WHEN E.telemetry_timestamp IS NULL THEN E.timestamp ELSE E.telemetry_timestamp END = T.timestamp
    ORDER BY ${order_by}`,
    vals.values()
  )

  return rows.map(
    ({ vehicle_id, lat, lng, speed, heading, accuracy, altitude, charge, telemetry_timestamp, ...event }) => ({
      ...event,
      vehicle_id,
      telemetry: telemetry_timestamp
        ? {
            timestamp: telemetry_timestamp,
            gps: { lat, lng, speed, heading, accuracy, altitude },
            charge
          }
        : null
    })
  )
}

// TODO way too slow to be useful -- move into mds-agency-cache
export async function getMostRecentEventByProvider(): Promise<{ provider_id: UUID; max: number }[]> {
  const sql = `select provider_id, max(recorded) from ${schema.TABLE.events} group by provider_id`
  return makeReadOnlyQuery(sql)
}
