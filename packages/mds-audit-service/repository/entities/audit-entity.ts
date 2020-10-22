import { Entity, Column } from 'typeorm'
import { BigintTransformer, IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { Nullable, Timestamp } from '@mds-core/mds-types'
import { AuditDomainModel } from '../../@types'

export interface AuditEntityModel extends IdentityColumn, RecordedColumn {
  audit_trip_id: AuditDomainModel['audit_trip_id']
  audit_device_id: AuditDomainModel['audit_device_id']
  audit_subject_id: AuditDomainModel['audit_subject_id']
  provider_id: AuditDomainModel['provider_id']
  provider_name: AuditDomainModel['provider_name']
  provider_vehicle_id: AuditDomainModel['provider_vehicle_id']
  provider_device_id: AuditDomainModel['provider_device_id']
  timestamp: AuditDomainModel['timestamp']
  deleted: Nullable<Timestamp>
}

@Entity('audits')
export class AuditEntity extends IdentityColumn(RecordedColumn(class {})) implements AuditEntityModel {
  @Column('uuid', { primary: true })
  audit_trip_id: AuditEntityModel['audit_trip_id']

  @Column('uuid')
  audit_device_id: AuditEntityModel['audit_device_id']

  @Column('varchar', { length: 255 })
  audit_subject_id: AuditEntityModel['audit_subject_id']

  @Column('uuid')
  provider_id: AuditEntityModel['provider_id']

  @Column('varchar', { length: 127 })
  provider_name: AuditEntityModel['provider_name']

  @Column('varchar', { length: 255 })
  provider_vehicle_id: AuditEntityModel['provider_vehicle_id']

  @Column('uuid', { nullable: true })
  provider_device_id: AuditEntityModel['provider_device_id']

  @Column('bigint', { transformer: BigintTransformer })
  timestamp: AuditEntityModel['timestamp']

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  deleted: AuditEntityModel['deleted']
}
