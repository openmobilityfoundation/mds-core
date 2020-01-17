import { Entity, Column } from 'typeorm'
import { UUID, PROPULSION_TYPE, VEHICLE_TYPE } from '@mds-core/mds-types'
import { RecordedEntity, RecordedPersistenceModel } from './recorded-entity'
import { Nullable } from './types'

export interface DevicePersistenceModel extends RecordedPersistenceModel {
  device_id: UUID
  provider_id: UUID
  vehicle_id: string
  type: VEHICLE_TYPE
  propulsion: PROPULSION_TYPE[]
  year: Nullable<number>
  mfgr: Nullable<string>
  model: Nullable<string>
}

@Entity('devices')
export class DeviceEntity extends RecordedEntity implements DevicePersistenceModel {
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
  year: Nullable<number>

  @Column('varchar', { length: 127, nullable: true })
  mfgr: Nullable<string>

  @Column('varchar', { length: 127, nullable: true })
  model: Nullable<string>
}
