import { Entity, Column } from 'typeorm'
import {
  VEHICLE_TYPE,
  Timestamp,
  UUID,
  VEHICLE_STATUS,
  VEHICLE_EVENT,
  VEHICLE_REASON,
  AnnotationData,
  GpsData
} from '@mds-core/mds-types'
import { RecordedEntity, RecordedPersistenceModel } from './recorded-entity'
import { Nullable } from './types'
import { BigintTransformer } from './transformers'

export interface ReportsDeviceStatePeristenceModel extends RecordedPersistenceModel {
  vehicle_type: VEHICLE_TYPE
  type: string
  timestamp: Timestamp
  device_id: UUID
  provider_id: UUID
  annotation_version: Nullable<number>
  annotation: Nullable<AnnotationData>
  gps: Nullable<GpsData>
  service_area_id: Nullable<UUID>
  charge: Nullable<number>
  state: VEHICLE_STATUS
  event_type: VEHICLE_EVENT
  event_type_reason: VEHICLE_REASON
  trip_id: Nullable<UUID>
}

@Entity('reports_device_states')
export class ReportsDeviceStateEntity extends RecordedEntity implements ReportsDeviceStatePeristenceModel {
  @Column('varchar', { length: 31 })
  vehicle_type: VEHICLE_TYPE

  @Column('varchar', { length: 31, primary: true })
  type: string

  @Column('bigint', { transformer: BigintTransformer, primary: true })
  timestamp: Timestamp

  @Column('uuid', { primary: true })
  device_id: UUID

  @Column('uuid', { primary: true })
  provider_id: UUID

  @Column('smallint', { nullable: true })
  annotation_version: Nullable<number>

  @Column('json', { nullable: true })
  annotation: Nullable<AnnotationData>

  @Column('json', { nullable: true })
  gps: Nullable<GpsData>

  @Column('uuid', { nullable: true })
  service_area_id: Nullable<UUID>

  @Column('real', { nullable: true })
  charge: Nullable<number>

  @Column('varchar', { length: 255, nullable: true })
  state: VEHICLE_STATUS

  @Column('varchar', { length: 31, nullable: true })
  event_type: VEHICLE_EVENT

  @Column('varchar', { length: 31, nullable: true })
  event_type_reason: VEHICLE_REASON

  @Column('uuid', { nullable: true })
  trip_id: Nullable<UUID>
}
