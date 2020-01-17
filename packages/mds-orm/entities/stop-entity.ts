import { Entity, Column } from 'typeorm'
import { UUID, VehicleTypeCost, VehicleTypeCount } from '@mds-core/mds-types'
import { RecordedEntity, RecordedModel } from './recorded-entity'
import { Nullable } from './types'

export interface StopModel extends RecordedModel {
  stop_id: UUID
  stop_name: string
  short_name: Nullable<string>
  platform_code: Nullable<string>
  geography_id: UUID
  zone_id: Nullable<string>
  address: Nullable<string>
  post_code: Nullable<string>
  rental_methods: Nullable<string>
  capacity: Nullable<VehicleTypeCount>
  location_type: Nullable<string>
  timezone: Nullable<string>
  cross_street: Nullable<string>
  num_vehicles_available: VehicleTypeCount
  num_vehicles_disabled: Nullable<VehicleTypeCount>
  num_spots_available: VehicleTypeCount
  num_spots_disabled: Nullable<VehicleTypeCount>
  wheelchair_boarding: boolean
  reservation_cost: Nullable<VehicleTypeCost>
}

@Entity('stops')
export class StopEntity extends RecordedEntity implements StopModel {
  @Column('uuid', { primary: true })
  stop_id: UUID

  @Column('varchar', { length: 255 })
  stop_name: string

  @Column('varchar', { length: 31, nullable: true })
  short_name: Nullable<string>

  @Column('varchar', { length: 255, nullable: true })
  platform_code: Nullable<string>

  @Column('uuid')
  geography_id: UUID

  @Column('varchar', { length: 255, nullable: true })
  zone_id: Nullable<string>

  @Column('varchar', { length: 255, nullable: true })
  address: Nullable<string>

  @Column('varchar', { length: 255, nullable: true })
  post_code: Nullable<string>

  @Column('varchar', { length: 255, nullable: true })
  rental_methods: Nullable<string>

  @Column('jsonb', { nullable: true })
  capacity: Nullable<VehicleTypeCount>

  @Column('varchar', { length: 255, nullable: true })
  location_type: Nullable<string>

  @Column('varchar', { length: 255, nullable: true })
  timezone: Nullable<string>

  @Column('varchar', { length: 255, nullable: true })
  cross_street: Nullable<string>

  @Column('jsonb')
  num_vehicles_available: VehicleTypeCount

  @Column('jsonb', { nullable: true })
  num_vehicles_disabled: Nullable<VehicleTypeCount>

  @Column('jsonb')
  num_spots_available: VehicleTypeCount

  @Column('jsonb', { nullable: true })
  num_spots_disabled: Nullable<VehicleTypeCount>

  @Column('boolean', { default: false })
  wheelchair_boarding: boolean

  @Column('jsonb', { nullable: true })
  reservation_cost: Nullable<VehicleTypeCost>
}
