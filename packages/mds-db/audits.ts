import { Audit, AuditEvent, UUID, Recorded } from '@mds-core/mds-types'
import { now } from '@mds-core/mds-utils'
import log from '@mds-core/mds-logger'

import { ReadAuditsQueryParams } from './types'

import schema from './schema'

import { vals_sql, cols_sql, vals_list, logSql, SqlVals } from './sql-utils'

import { getReadOnlyClient, getWriteableClient } from './client'

export async function readAudit(audit_trip_id: UUID) {
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

export async function readAudits(query: ReadAuditsQueryParams) {
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

export async function writeAudit(audit: Audit): Promise<Recorded<Audit>> {
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

export async function deleteAudit(audit_trip_id: UUID) {
  const client = await getWriteableClient()
  const sql = `UPDATE ${schema.TABLE.audits} SET deleted=$1 WHERE audit_trip_id=$2 AND deleted IS NULL`
  const values = [now(), audit_trip_id]
  await logSql(sql, values)
  const result = await client.query(sql, values)
  return result.rowCount
}

export async function readAuditEvents(audit_trip_id: UUID): Promise<Recorded<AuditEvent>[]> {
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

export async function writeAuditEvent(audit_event: AuditEvent): Promise<Recorded<AuditEvent>> {
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
