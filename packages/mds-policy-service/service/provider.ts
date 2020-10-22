import { ServiceProvider, ProcessController, ServiceResult } from '@mds-core/mds-service-helpers'
import { PolicyService } from '../@types'
import { PolicyRepository } from '../repository'

export const PolicyServiceProvider: ServiceProvider<PolicyService> & ProcessController = {
  start: PolicyRepository.initialize,
  stop: PolicyRepository.shutdown,
  name: async () => ServiceResult('mds-policy-service')
}
