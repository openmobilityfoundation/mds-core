import { Entity, Column } from 'typeorm'
import { BigintTransformer, IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { EventDomainModel } from '../../@types'

export interface EventEntityModel extends IdentityColumn, RecordedColumn {
  device_id: EventDomainModel['device_id']
  provider_id: EventDomainModel['provider_id']
  timestamp: EventDomainModel['timestamp']
  event_type: EventDomainModel['event_type']
  event_type_reason: EventDomainModel['event_type_reason']
  telemetry_timestamp: EventDomainModel['telemetry_timestamp']
  trip_id: EventDomainModel['trip_id']
  service_area_id: EventDomainModel['service_area_id']
}

@Entity('events')
export class EventEntity extends IdentityColumn(RecordedColumn(class {})) implements EventEntityModel {
  @Column('uuid', { primary: true })
  device_id: EventEntityModel['device_id']

  @Column('uuid')
  provider_id: EventEntityModel['provider_id']

  @Column('bigint', { transformer: BigintTransformer, primary: true })
  timestamp: EventEntityModel['timestamp']

  @Column('varchar', { length: 31 })
  event_type: EventEntityModel['event_type']

  @Column('varchar', { length: 31, nullable: true })
  event_type_reason: EventEntityModel['event_type_reason']

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  telemetry_timestamp: EventEntityModel['telemetry_timestamp']

  @Column('uuid', { nullable: true })
  trip_id: EventEntityModel['trip_id']

  @Column('uuid', { nullable: true })
  service_area_id: EventEntityModel['service_area_id']
}
