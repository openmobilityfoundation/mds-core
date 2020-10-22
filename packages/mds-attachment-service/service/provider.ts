import { ServiceProvider, ProcessController, ServiceResult } from '@mds-core/mds-service-helpers'
import { AttachmentService } from '../@types'
import { AttachmentRepository } from '../repository'

export const AttachmentServiceProvider: ServiceProvider<AttachmentService> & ProcessController = {
  start: AttachmentRepository.initialize,
  stop: AttachmentRepository.shutdown,
  name: async () => ServiceResult('mds-attachment-service')
}
