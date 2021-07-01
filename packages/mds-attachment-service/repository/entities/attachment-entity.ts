/**
 * Copyright 2020 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { Column, Entity, Index } from 'typeorm'
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
