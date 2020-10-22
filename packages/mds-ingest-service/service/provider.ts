import { ServiceProvider, ProcessController, ServiceResult } from '@mds-core/mds-service-helpers'
import { IngestService } from '../@types'
import { IngestRepository } from '../repository'

export const IngestServiceProvider: ServiceProvider<IngestService> & ProcessController = {
  start: IngestRepository.initialize,
  stop: IngestRepository.shutdown,
  name: async () => ServiceResult('mds-ingest-service')
}
