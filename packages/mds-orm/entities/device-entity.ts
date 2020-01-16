import { Entity, Column } from 'typeorm'
import { UUID, PROPULSION_TYPE, VEHICLE_TYPE } from '@mds-core/mds-types'
import { RecordedEntity } from './recorded-entity'

@Entity('devices')
export class DeviceEntity extends RecordedEntity {
  @Column('uuid', { primary: true })
  device_id: UUID

  @Column('uuid')
  provider_id: UUID

  @Column('varchar', { length: 255 })
  vehicle_id: string

  @Column('varchar', { length: 31 })
  type: VEHICLE_TYPE

  @Column('varchar', { array: true })
  propulsion: PROPULSION_TYPE[]

  @Column('smallint', { nullable: true })
  year: number

  @Column('varchar', { length: 127, nullable: true })
  mfgr: string

  @Column('varchar', { length: 127, nullable: true })
  model: string
}
