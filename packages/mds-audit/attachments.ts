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
import log from '@mds-core/mds-logger'
import aws from 'aws-sdk'
import path from 'path'
import sharp from 'sharp'
import uuid from 'uuid'
import { Attachment, AttachmentSummary, AuditAttachment, Recorded, UUID } from '@mds-core/mds-types'
import { UnsupportedTypeError, ValidationError } from '@mds-core/mds-utils'

/* eslint-disable-next-line */
const multer = require('multer')
const { env } = process
const supportedMimetypes = ['image/png', 'image/jpeg']
const thumbnailSize = Number(env.ATTACHMENTS_THUMBNAIL_SIZE || 250)
const s3Bucket = String(env.ATTACHMENTS_BUCKET)
const s3BucketSubdir = String(env.ATTACHMENTS_SUBDIR)
const s3Region = String(env.ATTACHMENTS_REGION)
const s3ACL = String(env.ATTACHMENTS_ACL)
const s3 = new aws.S3()
const memoryStorage = multer.memoryStorage()

/* eslint-disable-next-line */
aws.config.getCredentials(async (err) => {
  if (err) {
    await log.error('Error getting AWS credentials', err.stack || err)
  } else if (aws.config.credentials) {
    aws.config.update({
      secretAccessKey: aws.config.credentials.secretAccessKey,
      accessKeyId: aws.config.credentials.accessKeyId,
      region: s3Region
    })
  }
})

export const multipartFormUpload = multer({ storage: memoryStorage }).single('file')

export function attachmentSummary(attachment: Attachment): AttachmentSummary {
  const thumbnailUrl = attachment.thumbnail_filename ? attachment.base_url + attachment.thumbnail_filename : ''
  return {
    attachment_id: attachment.attachment_id,
    attachment_url: attachment.base_url + attachment.attachment_filename,
    thumbnail_url: thumbnailUrl
  }
}

export function validateFile(file: Express.Multer.File) {
  if (!file || file.buffer.byteLength === 0) {
    throw new ValidationError('No attachment found')
  } else if (path.extname(file.originalname).replace('.', '') === '') {
    throw new ValidationError(`Missing file extension in filename ${file.originalname}`)
  } else if (!supportedMimetypes.includes(file.mimetype)) {
    throw new UnsupportedTypeError(`Unsupported mime type ${file.mimetype}`)
  }
}

async function writeAttachmentS3(file: Express.Multer.File) {
  // Process attachment and thumbnail and output to Buffers
  const [attachmentBuf, thumbnailBuf] = await Promise.all([
    sharp(file.buffer)
      .rotate() // automatically based on EXIF
      .toBuffer(),
    sharp(file.buffer)
      .rotate()
      .resize(thumbnailSize, thumbnailSize, {
        fit: sharp.fit.inside,
        withoutEnlargement: true
      })
      .toBuffer()
  ])

  // Upload attachment and thumbnail to S3
  const attachmentId = uuid()
  const ext = path.extname(file.originalname).toLowerCase()
  const attachmentFilename = attachmentId + ext
  const thumbnailFilename = `${attachmentId}.thumbnail${ext}`
  await Promise.all([
    s3
      .upload({
        Bucket: s3Bucket,
        Key: [s3BucketSubdir, attachmentFilename].join('/'),
        Body: attachmentBuf,
        ACL: s3ACL
      })
      .promise(),
    s3
      .upload({
        Bucket: s3Bucket,
        Key: [s3BucketSubdir, thumbnailFilename].join('/'),
        Body: thumbnailBuf,
        ACL: s3ACL
      })
      .promise()
  ])
  return {
    attachment_filename: attachmentFilename,
    attachment_id: attachmentId,
    base_url: `https://${s3Bucket}.s3-${s3Region}.amazonaws.com/${s3BucketSubdir}/`,
    mimetype: file.mimetype,
    thumbnail_filename: thumbnailFilename,
    thumbnail_mimetype: file.mimetype
  }
}

export async function writeAttachment(file: Express.Multer.File, auditTripId: UUID) {
  const attachment = await writeAttachmentS3(file)
  await db.writeAttachment(attachment)
  await db.writeAuditAttachment({
    attachment_id: attachment.attachment_id,
    audit_trip_id: auditTripId
  } as AuditAttachment)
  return attachment
}

export async function readAttachments(audit_trip_id: UUID): Promise<Recorded<Attachment>[]> {
  const result: Recorded<Attachment>[] = await db.readAttachmentsForAudit(audit_trip_id)
  return result
}

export async function deleteAttachmentS3(attachment: Attachment) {
  const deletePromises = [
    s3
      .deleteObject({
        Bucket: s3Bucket,
        Key: s3Bucket.concat('/', attachment.attachment_filename)
      })
      .promise()
  ]
  if (attachment.thumbnail_filename) {
    deletePromises.push(
      s3
        .deleteObject({
          Bucket: s3Bucket,
          Key: s3Bucket.concat('/', attachment.thumbnail_filename)
        })
        .promise()
    )
  }
  await Promise.all(deletePromises)
}

export async function deleteAuditAttachment(auditTripId: UUID, attachmentId: UUID) {
  try {
    await db.deleteAuditAttachment(auditTripId, attachmentId)
    // Delete the attachment if it is not used by any other audits
    const auditAttachments = await db.readAuditAttachments(attachmentId)
    if (auditAttachments.length === 0) {
      const attachment = await db.deleteAttachment(attachmentId)
      if (attachment) {
        await deleteAttachmentS3(attachment)
      }
    }
  } catch (err) {
    await log.error('deleteAttachment error', err.stack || err)
    throw err
  }
}
