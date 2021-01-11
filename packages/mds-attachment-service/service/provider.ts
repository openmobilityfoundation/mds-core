import { ServiceProvider, ProcessController, ServiceResult, ServiceException } from '@mds-core/mds-service-helpers'
import { UUID } from '@mds-core/mds-types'
import logger from '@mds-core/mds-logger'
import { AttachmentService, ReadAttachmentsOptions } from '../@types'
import { AttachmentRepository } from '../repository'
import { writeAttachmentS3, deleteAttachmentS3, validateFile } from './helpers'

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
      logger.error(exception, error)
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
      logger.error(exception, error)
      return exception
    }
  },
  readAttachment: async (attachment_id: UUID) => {
    try {
      const attachment = await AttachmentRepository.readAttachment(attachment_id)
      return ServiceResult(attachment)
    } catch (error) {
      const exception = ServiceException('Error Reading Attachment', error)
      logger.error(exception, error)
      return exception
    }
  },
  readAttachments: async (options: ReadAttachmentsOptions) => {
    try {
      const attachments = await AttachmentRepository.readAttachments(options)
      return ServiceResult(attachments)
    } catch (error) {
      const exception = ServiceException('Error Reading Attachments', error)
      logger.error(exception, error)
      return exception
    }
  }
}
