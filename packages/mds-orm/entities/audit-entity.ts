import { Entity, Column } from 'typeorm'
import { UUID } from '@mds-core/mds-types'
import { BigintTransformer } from './transformers'
import { RecordedEntity, RecordedModel } from './recorded-entity'
import { Nullable } from './types'

export interface AuditModel extends RecordedModel {
  audit_trip_id: UUID
  audit_device_id: UUID
  audit_subject_id: string
  provider_id: UUID
  provider_name: string
  provider_vehicle_id: string
  provider_device_id: UUID
  timestamp: number
  deleted: Nullable<number>
}

@Entity('audits')
export class AuditEntity extends RecordedEntity implements AuditModel {
  @Column('uuid', { primary: true })
  audit_trip_id: UUID

  @Column('uuid')
  audit_device_id: UUID

  @Column('varchar', { length: 255 })
  audit_subject_id: string

  @Column('uuid')
  provider_id: UUID

  @Column('varchar', { length: 127 })
  provider_name: string

  @Column('varchar', { length: 255 })
  provider_vehicle_id: string

  @Column('uuid', { nullable: true })
  provider_device_id: UUID

  @Column('bigint', { transformer: BigintTransformer })
  timestamp: number

  @Column('bigint', { nullable: true, transformer: BigintTransformer })
  deleted: Nullable<number>
}
