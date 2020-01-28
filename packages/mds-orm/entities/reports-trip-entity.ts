import { Entity, Column } from 'typeorm'
import { VEHICLE_TYPE, UUID, Timestamp, TripEvent, TripTelemetry } from '@mds-core/mds-types'
import { RecordedEntity, RecordedPersistenceModel } from './recorded-entity'
import { Nullable } from './types'
import { BigintTransformer } from './transformers'

export interface ReportsTripPersistenceModel extends RecordedPersistenceModel {
  vehicle_type: VEHICLE_TYPE

  trip_id: UUID

  device_id: UUID

  provider_id: UUID

  start_time: Timestamp

  end_time: Timestamp

  start_service_area_id: Nullable<UUID>

  end_service_area_id: Nullable<UUID>

  duration: number

  distance: Nullable<number>

  violation_count: number

  max_violation_dist: Nullable<number>

  min_violation_dist: Nullable<number>

  avg_violation_dist: Nullable<number>

  events: TripEvent[]

  telemetry: { [timestamp: number]: TripTelemetry[] }
}

@Entity('reports_trips')
export class ReportsTripEntity extends RecordedEntity implements ReportsTripPersistenceModel {
  @Column('varchar', { length: 31 })
  vehicle_type: VEHICLE_TYPE

  @Column('uuid', { primary: true })
  trip_id: UUID

  @Column('uuid', { primary: true })
  device_id: UUID

  @Column('uuid', { primary: true })
  provider_id: UUID

  @Column('bigint', { transformer: BigintTransformer })
  start_time: Timestamp

  @Column('bigint', { transformer: BigintTransformer })
  end_time: Timestamp

  @Column('uuid', { nullable: true })
  start_service_area_id: Nullable<UUID>

  @Column('uuid', { nullable: true })
  end_service_area_id: Nullable<UUID>

  @Column('bigint', { transformer: BigintTransformer })
  duration: number

  @Column('double precision', { nullable: true })
  distance: Nullable<number>

  @Column('int')
  violation_count: number

  @Column('double precision', { nullable: true })
  max_violation_dist: Nullable<number>

  @Column('double precision', { nullable: true })
  min_violation_dist: Nullable<number>

  @Column('double precision', { nullable: true })
  avg_violation_dist: Nullable<number>

  @Column('json', { array: true })
  events: TripEvent[]

  @Column('json')
  telemetry: { [timestamp: number]: TripTelemetry[] }
}
