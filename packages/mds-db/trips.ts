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

import { UUID, Timestamp } from '@mds-core/mds-types'
import logger from '@mds-core/mds-logger'

import schema from './schema'

import { logSql, SqlVals } from './sql-utils'

import { getReadOnlyClient } from './client'

export interface ReadTripIdsResult {
  count: number
  tripIds: UUID[]
}

export interface ReadTripIdsQueryParams {
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
    logger.error('readTripIds error', err)
    throw err
  }
}
