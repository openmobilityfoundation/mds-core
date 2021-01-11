import { Entity, Column, Index } from 'typeorm'
import { IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { AttachmentDomainModel } from '../../@types'

export interface AttachmentEntityModel extends IdentityColumn, RecordedColumn {
  attachment_id: AttachmentDomainModel['attachment_id']
  attachment_filename: AttachmentDomainModel['attachment_filename']
  base_url: AttachmentDomainModel['base_url']
  mimetype: AttachmentDomainModel['mimetype']
  thumbnail_filename: AttachmentDomainModel['thumbnail_filename']
  thumbnail_mimetype: AttachmentDomainModel['thumbnail_mimetype']
  attachment_list_id: AttachmentDomainModel['attachment_list_id']
}

@Entity('attachments')
export class AttachmentEntity extends IdentityColumn(RecordedColumn(class {})) implements AttachmentEntityModel {
  @Column('uuid', { primary: true })
  attachment_id: AttachmentEntityModel['attachment_id']

  @Column('varchar', { length: 64 })
  attachment_filename: AttachmentEntityModel['attachment_filename']

  @Column('varchar', { length: 127 })
  base_url: AttachmentEntityModel['base_url']

  @Column('varchar', { length: 255 })
  mimetype: AttachmentEntityModel['mimetype']

  @Column('varchar', { length: 64, nullable: true })
  thumbnail_filename: AttachmentEntityModel['thumbnail_filename']

  @Column('varchar', { length: 64, nullable: true })
  thumbnail_mimetype: AttachmentEntityModel['thumbnail_mimetype']

  @Index()
  @Column('uuid', { nullable: true })
  attachment_list_id: AttachmentEntityModel['attachment_list_id']
}
