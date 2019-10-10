import { UUID, Timestamp, Recorded } from '@mds-core/mds-types'
import { now, isUUID, isTimestamp, csv } from '@mds-core/mds-utils'
import log from '@mds-core/mds-logger'

import { ReadTripsResult, Trip } from './types'

import schema from './schema'

import { cols_sql, vals_list, to_sql, logSql, SqlVals, SqlExecuter } from './sql-utils'

import { getReadOnlyClient, getWriteableClient } from './client'

export async function readTripList(trip_ids: UUID[]) {
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

export async function updateTrip(provider_trip_id: UUID, trip: Partial<Trip>) {
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

export async function writeTrips(trips: Trip[]): Promise<Recorded<Trip>[]> {
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

export async function readTrips(
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
