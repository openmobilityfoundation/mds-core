import { Entity, Column } from 'typeorm'
import { UUID, Timestamp, VEHICLE_EVENT, AUDIT_EVENT_TYPE } from '@mds-core/mds-types'
import { BigintTransformer } from './transformers'
import { RecordedEntity, RecordedModel } from './recorded-entity'
import { Nullable } from './types'

export interface AuditEventModel extends RecordedModel {
  audit_trip_id: UUID
  audit_event_id: UUID
  audit_event_type: AUDIT_EVENT_TYPE | VEHICLE_EVENT
  audit_issue_code: Nullable<string>
  audit_subject_id: string
  note: Nullable<string>
  timestamp: Timestamp
  lat: number
  lng: number
  speed: Nullable<number>
  heading: Nullable<number>
  accuracy: Nullable<number>
  altitude: Nullable<number>
  charge: Nullable<number>
}

@Entity('audit_events')
export class AuditEventEntity extends RecordedEntity implements AuditEventModel {
  @Column('uuid', { primary: true })
  audit_trip_id: UUID

  @Column('uuid')
  audit_event_id: UUID

  @Column('varchar', { length: 31 })
  audit_event_type: AUDIT_EVENT_TYPE | VEHICLE_EVENT

  @Column('varchar', { length: 31, nullable: true })
  audit_issue_code: Nullable<string>

  @Column('varchar', { length: 255 })
  audit_subject_id: string

  @Column('varchar', { length: 255, nullable: true })
  note: Nullable<string>

  @Column('bigint', { transformer: BigintTransformer, primary: true })
  timestamp: Timestamp

  @Column('double precision')
  lat: number

  @Column('double precision')
  lng: number

  @Column('real', { nullable: true })
  speed: Nullable<number>

  @Column('real', { nullable: true })
  heading: Nullable<number>

  @Column('real', { nullable: true })
  accuracy: Nullable<number>

  @Column('real', { nullable: true })
  altitude: Nullable<number>

  @Column('real', { nullable: true })
  charge: Nullable<number>
}
