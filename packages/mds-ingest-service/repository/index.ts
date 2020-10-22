import { ReadWriteRepository } from '@mds-core/mds-repository'
import entities from './entities'
import migrations from './migrations'

class IngestReadWriteRepository extends ReadWriteRepository {
  constructor() {
    super('ingest', { entities, migrations })
  }
}

export const IngestRepository = new IngestReadWriteRepository()
