import { Entity, Index, Column } from 'typeorm'
import { UUID } from '@mds-core/mds-types'
import { BigintTransformer } from './transformers'

const table = 'devices'

@Entity(table)
export class DeviceEntity {
  @Column('bigint', { generated: 'increment', transformer: BigintTransformer })
  @Index(`${table}_id_idx`, { unique: true })
  id: number

  @Column('uuid', { primary: true })
  device_id: UUID

  @Column('uuid')
  provider_id: UUID

  @Column('varchar', { length: 255 })
  vehicle_id: string

  @Column('varchar', { length: 31 })
  type: string

  @Column('varchar', { array: true })
  propulsion: string[]

  @Column('smallint', { nullable: true })
  year: number

  @Column('varchar', { length: 127, nullable: true })
  mfgr: string

  @Column('varchar', { length: 127, nullable: true })
  model: string

  @Column('bigint', { transformer: BigintTransformer })
  @Index(`${table}_recorded_idx`)
  recorded: number
}
