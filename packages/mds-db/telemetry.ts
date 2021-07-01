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

import logger from '@mds-core/mds-logger'
import { Recorded, Telemetry, Timestamp, UUID } from '@mds-core/mds-types'
import { csv, now } from '@mds-core/mds-utils'
import { getReadOnlyClient, getWriteableClient, makeReadOnlyQuery } from './client'
import schema from './schema'
import { cols_sql, logSql, SqlVals, to_sql, vals_list } from './sql-utils'
import { TelemetryRecord } from './types'

export function convertTelemetryToTelemetryRecord(telemetry: Telemetry): TelemetryRecord {
  const {
    gps: { lat, lng, altitude, heading, speed, accuracy },
    recorded = now(),
    ...props
  } = telemetry
  return {
    ...props,
    lat,
    lng,
    altitude,
    heading,
    speed,
    accuracy,
    recorded
  }
}

export function convertTelemetryRecordToTelemetry(telemetryRecord: TelemetryRecord): Telemetry {
  const { lat, lng, altitude, heading, speed, accuracy, ...props } = telemetryRecord
  return {
    ...props,
    gps: { lat, lng, altitude, heading, speed, accuracy }
  }
}

export async function writeTelemetry(telemetries: Telemetry[]): Promise<Recorded<Telemetry>[]> {
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
      logger.info(
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
    logger.error('pg write telemetry error', err)
    throw err
  }
}

export async function readTelemetry(
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
    logger.error('read telemetry error', err)
    throw err
  }
}

// TODO way too slow to be useful -- move into mds-agency-cache
export async function getMostRecentTelemetryByProvider(): Promise<{ provider_id: UUID; max: number }[]> {
  const sql = `select provider_id, max(recorded) from ${schema.TABLE.telemetry} group by provider_id`
  return makeReadOnlyQuery(sql)
}
