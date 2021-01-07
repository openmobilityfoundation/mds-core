import { DeleteReturning, InsertReturning, ReadWriteRepository, RepositoryError } from '@mds-core/mds-repository'
import { AttachmentDomainToEntityCreate, AttachmentEntityToDomain } from './mappers'
import { AttachmentDomainModel } from '../@types'
import { AttachmentEntity } from './entities/attachment-entity'

import entities from './entities'
import migrations from './migrations'

class AttachmentReadWriteRepository extends ReadWriteRepository {
  constructor() {
    super('attachments', { entities, migrations })
  }

  public writeAttachment = async (attachment: AttachmentDomainModel): Promise<AttachmentDomainModel> => {
    const { connect } = this
    try {
      const connection = await connect('rw')

      const {
        raw: [entity]
      }: InsertReturning<AttachmentEntity> = await connection
        .getRepository(AttachmentEntity)
        .createQueryBuilder()
        .insert()
        .values([AttachmentDomainToEntityCreate.map(attachment)])
        .returning('*')
        .execute()
      return AttachmentEntityToDomain.map(entity)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public deleteAttachment = async (attachment_id: string): Promise<AttachmentDomainModel> => {
    const { connect } = this
    try {
      const connection = await connect('rw')

      const {
        raw: [entity]
      }: DeleteReturning<AttachmentEntity> = await connection
        .getRepository(AttachmentEntity)
        .createQueryBuilder()
        .delete()
        .where('attachment_id = :attachment_id', { attachment_id })
        .returning('*')
        .execute()

      return AttachmentEntityToDomain.map(entity)
    } catch (error) {
      throw RepositoryError(error)
    }
  }
}

export const AttachmentRepository = new AttachmentReadWriteRepository()
