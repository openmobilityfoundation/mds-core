import { ReadWriteRepository } from '@mds-core/mds-repository'
import entities from './entities'
import migrations from './migrations'

class AttachmentReadWriteRepository extends ReadWriteRepository {
  constructor() {
    super('attachments', { entities, migrations })
  }
}

export const AttachmentRepository = new AttachmentReadWriteRepository()
