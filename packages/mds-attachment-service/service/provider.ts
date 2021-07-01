/**
 * Copyright 2020 City of Los Angeles
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
import { ProcessController, ServiceException, ServiceProvider, ServiceResult } from '@mds-core/mds-service-helpers'
import { UUID } from '@mds-core/mds-types'
import { AttachmentService, ReadAttachmentsOptions } from '../@types'
import { AttachmentRepository } from '../repository'
import { deleteAttachmentS3, validateFile, writeAttachmentS3 } from './helpers'

export const AttachmentServiceProvider: ServiceProvider<AttachmentService> & ProcessController = {
  start: AttachmentRepository.initialize,
  stop: AttachmentRepository.shutdown,
  writeAttachment: async (rpc_file, attachment_list_id) => {
    try {
      const file = validateFile(rpc_file)
      const attachment = { ...(await writeAttachmentS3(file)), attachment_list_id }
      await AttachmentRepository.writeAttachment(attachment)
      return ServiceResult(attachment)
    } catch (error) {
      const exception = ServiceException('Error Writing Attachment', error)
      logger.error('mds-attachment-service::writeAttachment error', { exception, error })
      return exception
    }
  },
  deleteAttachment: async (attachment_id: UUID) => {
    try {
      const attachment = await AttachmentRepository.deleteAttachment(attachment_id)
      if (attachment) {
        await deleteAttachmentS3(attachment)
      }
      return ServiceResult(attachment)
    } catch (error) {
      const exception = ServiceException('Error Deleting Attachment', error)
      logger.error('mds-attachment-service::deleteAttachment error', { exception, error })
      return exception
    }
  },
  readAttachment: async (attachment_id: UUID) => {
    try {
      const attachment = await AttachmentRepository.readAttachment(attachment_id)
      return ServiceResult(attachment)
    } catch (error) {
      const exception = ServiceException('Error Reading Attachment', error)
      logger.error('mds-attachment-service::readAttachment error', { exception, error })
      return exception
    }
  },
  readAttachments: async (options: ReadAttachmentsOptions) => {
    try {
      const attachments = await AttachmentRepository.readAttachments(options)
      return ServiceResult(attachments)
    } catch (error) {
      const exception = ServiceException('Error Reading Attachments', error)
      logger.error('mds-attachment-service::readAttachments error', { exception, error })
      return exception
    }
  }
}
