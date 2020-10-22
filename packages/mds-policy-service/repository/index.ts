import { ReadWriteRepository } from '@mds-core/mds-repository'
import entities from './entities'
import migrations from './migrations'

class PolicyReadWriteRepository extends ReadWriteRepository {
  constructor() {
    super('policies', { entities, migrations })
  }
}

export const PolicyRepository = new PolicyReadWriteRepository()
