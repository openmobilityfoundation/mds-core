import { ReadWriteRepository } from '@mds-core/mds-repository'
import entities from './entities'
import migrations from './migrations'

class AuditReadWriteRepository extends ReadWriteRepository {
  constructor() {
    super('audits', { entities, migrations })
  }
}

export const AuditRepository = new AuditReadWriteRepository()
