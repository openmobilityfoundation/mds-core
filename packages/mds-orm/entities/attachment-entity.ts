import { Entity, Column } from 'typeorm'
import { UUID } from '@mds-core/mds-types'
import { RecordedEntity } from './recorded-entity'

@Entity('attachments')
export class AttachmentEntity extends RecordedEntity {
  @Column('varchar', { length: 64 })
  attachment_filename: string

  @Column('uuid', { primary: true })
  attachment_id: UUID

  @Column('varchar', { length: 127 })
  base_url: string

  @Column('varchar', { length: 255 })
  mimetype: string

  @Column('varchar', { length: 64, nullable: true })
  thumbnail_filename: string

  @Column('varchar', { length: 64, nullable: true })
  thumbnail_mimetype: string
}
