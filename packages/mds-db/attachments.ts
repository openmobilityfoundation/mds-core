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

import { Attachment, AuditAttachment, Recorded, UUID } from '@mds-core/mds-types'
import { NotFoundError, now } from '@mds-core/mds-utils'
import schema from './schema'
import { vals_sql, cols_sql, vals_list, logSql } from './sql-utils'
import { getReadOnlyClient, getWriteableClient } from './client'

export async function writeAttachment(attachment: Attachment): Promise<Recorded<Attachment>> {
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.attachments} (${cols_sql(
    schema.TABLE_COLUMNS.attachments
  )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.attachments)}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.attachments, { ...attachment, recorded: now() })
  await logSql(sql, values)
  const {
    rows: [recordedAttachment]
  }: { rows: Recorded<Attachment>[] } = await client.query(sql, values)
  return { ...attachment, ...recordedAttachment }
}

export async function readAttachmentsForAudit(audit_trip_id: UUID): Promise<Recorded<Attachment>[]> {
  const client = await getReadOnlyClient()
  const sql = `SELECT * FROM ${schema.TABLE.attachments} a JOIN ${schema.TABLE.audit_attachments} aa
    ON a.attachment_id = aa.attachment_id where aa.audit_trip_id = '${audit_trip_id}'`
  const { rows } = await client.query(sql)
  return rows
}

export async function readAuditAttachments(attachment_id: UUID): Promise<AuditAttachment[]> {
  const client = await getWriteableClient()
  const sql = `SELECT * FROM ${schema.TABLE.audit_attachments} WHERE attachment_id=$1`
  const res = await client.query(sql, [attachment_id])
  return res.rows
}

export async function writeAuditAttachment(auditAttachment: AuditAttachment): Promise<Recorded<AuditAttachment>> {
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.audit_attachments} (${cols_sql(
    schema.TABLE_COLUMNS.audit_attachments
  )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.audit_attachments)}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.audit_attachments, { ...auditAttachment, recorded: now() })
  await logSql(sql, values)
  const {
    rows: [recordedAuditAttachment]
  }: { rows: Recorded<AuditAttachment>[] } = await client.query(sql, values)
  return { ...auditAttachment, ...recordedAuditAttachment }
}

export async function deleteAttachment(attachment_id: UUID): Promise<Attachment | undefined> {
  const client = await getWriteableClient()
  const sql = `DELETE FROM ${schema.TABLE.attachments} WHERE attachment_id=$1 RETURNING *`
  const res = await client.query(sql, [attachment_id])
  if (res.rows.length > 0) {
    return { ...res.rows[0] } as Attachment
  }
  throw new NotFoundError(`Attachment ${attachment_id} not found`)
}

export async function deleteAuditAttachment(
  audit_trip_id: UUID,
  attachment_id: UUID
): Promise<AuditAttachment | undefined> {
  const client = await getWriteableClient()
  const sql = `DELETE FROM ${schema.TABLE.audit_attachments} WHERE attachment_id=$1 AND audit_trip_id=$2 RETURNING *`
  const res = await client.query(sql, [attachment_id, audit_trip_id])
  if (res.rows.length > 0) {
    return { ...res.rows[0] } as AuditAttachment
  }
  throw new NotFoundError(`Audit attachment ${audit_trip_id} ${attachment_id} not found`)
}
