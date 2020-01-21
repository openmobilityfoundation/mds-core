import { Entity, Column } from 'typeorm'
import {
  Timestamp,
  UUID,
  VEHICLE_TYPE,
  VEHICLE_METRIC_EVENT,
  VehicleCountMetricObj,
  LateMetricObj,
  MetricCount,
  MetricBadEvents,
  MetricSla,
  MetricBinSize
} from '@mds-core/mds-types'
import { RecordedEntity, RecordedPersistenceModel } from './recorded-entity'
import { BigintTransformer } from './transformers'
import { Nullable } from './types'

export interface ReportsProviderPersistenceModel extends RecordedPersistenceModel {
  start_time: Nullable<Timestamp>
}

@Entity('reports_providers')
export class ReportsProviderEntity extends RecordedEntity implements ReportsProviderPersistenceModel {
  @Column('bigint', { transformer: BigintTransformer, primary: true })
  start_time: Timestamp

  @Column('varchar', { length: 31 })
  bin_size: MetricBinSize

  @Column('varchar', { length: 64, nullable: true })
  geography: Nullable<string>

  @Column('uuid', { primary: true })
  provider_id: UUID

  @Column('varchar', { length: 31, primary: true })
  vehicle_type: VEHICLE_TYPE

  @Column('json', { nullable: true })
  event_counts: Nullable<{ [S in VEHICLE_METRIC_EVENT]: number }>

  @Column('json', { nullable: true })
  vehicle_counts: Nullable<VehicleCountMetricObj>

  @Column('integer', { nullable: true })
  trip_count: Nullable<number>

  @Column('json', { nullable: true })
  vehicle_trips_count: Nullable<{ [x: number]: number }>

  @Column('json', { nullable: true })
  event_time_violations: Nullable<LateMetricObj>

  @Column('json', { nullable: true })
  telemetry_distance_violations: Nullable<MetricCount>

  @Column('json', { nullable: true })
  bad_events: Nullable<MetricBadEvents>

  @Column('json', { nullable: true })
  sla: Nullable<MetricSla>
}
