import { ServiceProvider, ProcessController, ServiceResult } from '@mds-core/mds-service-helpers'
import { AuditService } from '../@types'
import { AuditRepository } from '../repository'

export const AuditServiceProvider: ServiceProvider<AuditService> & ProcessController = {
  start: AuditRepository.initialize,
  stop: AuditRepository.shutdown,
  name: async () => ServiceResult('mds-audit-service')
}
