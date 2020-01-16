import { Entity, Column } from 'typeorm'
import { UUID, Timestamp, VEHICLE_EVENT, VEHICLE_REASON } from '@mds-core/mds-types'
import { RecordedEntity, RecordedModel } from './recorded-entity'
import { BigintTransformer } from './transformers'
import { Nullable } from './types'

export interface VehicleEventModel extends RecordedModel {
  device_id: UUID
  provider_id: UUID
  timestamp: Timestamp
  event_type: VEHICLE_EVENT
  event_type_reason: Nullable<VEHICLE_REASON>
  telemetry_timestamp: Nullable<Timestamp>
  trip_id: Nullable<UUID>
  service_area_id: Nullable<UUID>
}

@Entity('events')
export class VehicleEventEntity extends RecordedEntity implements VehicleEventModel {
  @Column('uuid', { primary: true })
  device_id: UUID

  @Column('uuid')
  provider_id: UUID

  @Column('bigint', { primary: true, transformer: BigintTransformer })
  timestamp: Timestamp

  @Column('varchar', { length: 31 })
  event_type: VEHICLE_EVENT

  @Column('varchar', { length: 31, nullable: true })
  event_type_reason: Nullable<VEHICLE_REASON>

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  telemetry_timestamp: Nullable<Timestamp>

  @Column('uuid', { nullable: true })
  trip_id: Nullable<UUID>

  @Column('uuid', { nullable: true })
  service_area_id: Nullable<UUID>
}
