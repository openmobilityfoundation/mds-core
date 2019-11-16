import { UUID, Timestamp, VEHICLE_EVENT } from '@mds-core/mds-types'
import { now, yesterday } from '@mds-core/mds-utils'
import log from '@mds-core/mds-logger'

import schema from './schema'

import { logSql, SqlVals } from './sql-utils'

import { getReadOnlyClient, makeReadOnlyQuery } from './client'

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

export async function readTripIds(params: Partial<ReadTripIdsQueryParams> = {}): Promise<ReadTripIdsResult> {
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

export async function getTripCountsPerProviderSince(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: string; count: number }[]> {
  const sql = `select provider_id, count(event_type) from events where event_type='trip_end' and recorded > ${start} and recorded < ${stop} group by provider_id, event_type`
  return makeReadOnlyQuery(sql)
}

export async function getTripEventsLast24HoursByProvider(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: UUID; trip_id: UUID; event_type: VEHICLE_EVENT; recorded: number; timestamp: number }[]> {
  const sql = `select provider_id, trip_id, event_type, recorded, timestamp from ${schema.TABLE.events} where trip_id is not null and recorded > ${start} and recorded < ${stop} order by "timestamp"`
  return makeReadOnlyQuery(sql)
}
