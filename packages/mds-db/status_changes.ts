import { VehicleEvent, UUID, Timestamp, Recorded } from '@mds-core/mds-types'
import { now, isUUID, isTimestamp, csv } from '@mds-core/mds-utils'
import log from '@mds-core/mds-logger'
import { getReadOnlyClient, getWriteableClient, getLatestTime } from './client'

import { ReadStatusChangesResult, StatusChange } from './types'

import schema from './schema'

import { cols_sql, vals_list, to_sql, logSql, SqlVals, SqlExecuter } from './sql-utils'

export async function readStatusChanges(
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

export async function readUnprocessedStatusChangeEvents(
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

export async function writeStatusChanges(status_changes: StatusChange[]): Promise<Recorded<StatusChange>[]> {
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

export async function getLatestStatusChangeTime(): Promise<number> {
  return getLatestTime(schema.TABLE.status_changes, 'event_time')
}
