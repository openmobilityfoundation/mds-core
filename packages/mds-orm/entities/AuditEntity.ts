import { Entity, Index, Column } from 'typeorm'
import { UUID } from '@mds-core/mds-types'
import { BigintTransformer } from './transformers'

const table = 'audits'

@Entity(table)
export class AuditEntity {
  @Column('bigint', { generated: 'increment', transformer: BigintTransformer })
  @Index(`${table}_id_idx`, { unique: true })
  id: number

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
  deleted: number

  @Column('bigint', { transformer: BigintTransformer })
  @Index(`${table}_recorded_idx`)
  recorded: number
}
