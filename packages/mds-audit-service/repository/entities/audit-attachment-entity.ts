import { Entity, Column } from 'typeorm'
import { IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { AuditAttachmentDomainModel } from '../../@types'

export interface AuditAttachmentEntityModel extends IdentityColumn, RecordedColumn {
  audit_trip_id: AuditAttachmentDomainModel['audit_trip_id']
  attachment_id: AuditAttachmentDomainModel['attachment_id']
}

@Entity('audit_attachments')
export class AuditAttachmentEntity
  extends IdentityColumn(RecordedColumn(class {}))
  implements AuditAttachmentEntityModel {
  @Column('uuid', { primary: true })
  audit_trip_id: AuditAttachmentEntityModel['audit_trip_id']

  @Column('uuid', { primary: true })
  attachment_id: AuditAttachmentEntityModel['attachment_id']
}
