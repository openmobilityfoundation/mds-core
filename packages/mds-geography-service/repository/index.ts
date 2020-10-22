import { ReadWriteRepository } from '@mds-core/mds-repository'
import entities from './entities'
import migrations from './migrations'

class GeographyReadWriteRepository extends ReadWriteRepository {
  constructor() {
    super('geographies', { entities, migrations })
  }
}

export const GeographyRepository = new GeographyReadWriteRepository()
