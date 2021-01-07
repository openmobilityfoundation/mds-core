/* eslint-disable promise/no-callback-in-promise */
/* eslint-disable promise/no-nesting */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/always-return */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable promise/catch-or-return */
/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import db from '@mds-core/mds-db'
import { Attachment, AuditAttachment, Recorded } from '@mds-core/mds-types'
import { isUUID, NotFoundError, uuid } from '@mds-core/mds-utils'
import assert from 'assert'
import fs from 'fs'
import Sinon from 'sinon'
import { AttachmentServiceClient } from '@mds-core/mds-attachment-service'
import { attachmentSummary, deleteAuditAttachment, readAttachments, writeAttachment } from '../attachments'
import { getWriteableClient } from '../../mds-db/client'
import schema from '../../mds-db/schema'

/* eslint-disable-next-line */
const aws = require('aws-sdk')

describe('Testing Attachments Service', () => {
  const attachmentId = uuid()
  const auditTripId = uuid()
  const baseUrl = 'http://example.com/'
  const mimetype = 'image/png'
  const extension = '.png'
  const now = Date.now()
  const attachment = {
    attachment_id: attachmentId,
    attachment_filename: attachmentId + extension,
    base_url: baseUrl,
    mimetype,
    thumbnail_filename: `${attachmentId}.thumbnail${extension}`,
    attachment_mimetype: mimetype,
    recorded: now
  } as Attachment
  const auditAttachment = {
    attachment_id: attachmentId,
    audit_trip_id: auditTripId,
    recorded: now
  } as AuditAttachment
  const recordedAttachment = {
    ...{ id: 1 },
    ...attachment
  } as Recorded<Attachment>
  const attachmentFile = {
    fieldname: 'file',
    originalname: 'sample.png',
    encoding: '7bit',
    mimetype,
    size: 68,
    buffer: fs.readFileSync('./tests/sample.png')
  } as Express.Multer.File

  before('Initializing database', async () => {
    await db.reinitialize()
  })

  beforeEach(async () => {
    const client = await getWriteableClient()
    await client.query(`TRUNCATE ${schema.TABLE.attachments}, ${schema.TABLE.audit_attachments}`)
  })

  it('verify attachment summary', () => {
    const summary = attachmentSummary(attachment)
    assert.equal(summary.attachment_id, attachment.attachment_id)
    assert.equal(summary.attachment_url, attachment.base_url + attachment.attachment_filename)
    assert.equal(summary.thumbnail_url, attachment.base_url + attachment.thumbnail_filename)
  })

  it('verify attachment summary (without thumbnail)', () => {
    const summary = attachmentSummary({ ...attachment, ...{ thumbnail_filename: '' } })
    assert.equal(summary.attachment_id, attachment.attachment_id)
    assert.equal(summary.attachment_url, attachment.base_url + attachment.attachment_filename)
    assert.equal(summary.thumbnail_url, '')
  })

  it('verify writeAttachment', async () => {
    const writeAttachmentStub = Sinon.stub(AttachmentServiceClient, 'writeAttachment')
    const writeAuditAttachmentStub = Sinon.stub(db, 'writeAuditAttachment')
    writeAttachmentStub.resolves(attachment as any) // casting for the sake of test happiness
    const res: Attachment | null = await writeAttachment(attachmentFile, auditTripId)
    assert.equal(res && res.attachment_filename.includes('.png'), true)
    assert.equal(res && res.thumbnail_filename && res.thumbnail_filename.includes('.png'), true)
    assert.equal(res && isUUID(res.attachment_id), true)
    assert.equal(res && res.mimetype, mimetype)
    Sinon.assert.calledOnce(writeAttachmentStub)
    Sinon.assert.calledOnce(writeAuditAttachmentStub)
  })

  it('verify readAttachment', async () => {
    const readAttachmentsStub = Sinon.stub(db, 'readAttachmentsForAudit')
    readAttachmentsStub.resolves([recordedAttachment, recordedAttachment])
    const res: Recorded<Attachment>[] = await readAttachments(auditTripId)
    Sinon.assert.calledOnce(readAttachmentsStub)
    assert.equal(res.length, 2)
    assert.equal(res[0], recordedAttachment)
    assert.equal(res[1], recordedAttachment)
  })

  it('verify delete audit attachment (not found)', async () => {
    const deleteS3ObjectSpy = Sinon.spy(aws.S3.prototype.deleteObject)
    const deleteAttachmentSpy = Sinon.spy(db, 'deleteAttachment')
    const deleteAuditAttachmentSpy = Sinon.spy(db, 'deleteAuditAttachment')
    await assert.rejects(() => deleteAuditAttachment(uuid(), uuid()), NotFoundError)
    Sinon.assert.notCalled(deleteS3ObjectSpy)
    Sinon.assert.notCalled(deleteAttachmentSpy)
    Sinon.assert.calledOnce(deleteAuditAttachmentSpy)
  })

  it('verify delete audit attachment (still in use)', async () => {
    const deleteS3ObjectSpy = Sinon.spy(aws.S3.prototype.deleteObject)
    const deleteAttachmentSpy = Sinon.spy(db, 'deleteAttachment')
    const deleteAuditAttachmentSpy = Sinon.spy(db, 'deleteAuditAttachment')
    await db.writeAuditAttachment(auditAttachment)
    await db.writeAuditAttachment({ ...auditAttachment, ...{ audit_trip_id: uuid() } })
    await deleteAuditAttachment(auditAttachment.audit_trip_id, auditAttachment.attachment_id)
    Sinon.assert.notCalled(deleteS3ObjectSpy)
    Sinon.assert.notCalled(deleteAttachmentSpy)
    Sinon.assert.calledOnce(deleteAuditAttachmentSpy)
  })

  afterEach(() => {
    Sinon.restore()
  })

  after('Clearing and shutting down database', async () => {
    await db.reinitialize()
    await db.shutdown()
  })
})
