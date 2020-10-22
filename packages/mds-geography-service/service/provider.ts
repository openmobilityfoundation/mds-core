import { ServiceProvider, ProcessController, ServiceResult } from '@mds-core/mds-service-helpers'
import { GeographyService } from '../@types'
import { GeographyRepository } from '../repository'

export const GeographyServiceProvider: ServiceProvider<GeographyService> & ProcessController = {
  start: GeographyRepository.initialize,
  stop: GeographyRepository.shutdown,
  name: async () => ServiceResult('mds-geography-service')
}
