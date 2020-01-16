import { Entity, Column } from 'typeorm'
import { UUID } from '@mds-core/mds-types'
import { RecordedEntity, RecordedModel } from './recorded-entity'
import { Nullable } from './types'

export interface AttachmentModel extends RecordedModel {
  attachment_filename: string
  attachment_id: UUID
  base_url: string
  mimetype: string
  thumbnail_filename: Nullable<string>

  thumbnail_mimetype: Nullable<string>
}

@Entity('attachments')
export class AttachmentEntity extends RecordedEntity implements AttachmentModel {
  @Column('varchar', { length: 64 })
  attachment_filename: string

  @Column('uuid', { primary: true })
  attachment_id: UUID

  @Column('varchar', { length: 127 })
  base_url: string

  @Column('varchar', { length: 255 })
  mimetype: string

  @Column('varchar', { length: 64, nullable: true })
  thumbnail_filename: Nullable<string>

  @Column('varchar', { length: 64, nullable: true })
  thumbnail_mimetype: Nullable<string>
}
