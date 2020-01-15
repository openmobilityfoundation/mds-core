import { Entity, Column } from 'typeorm'
import { UUID, Timestamp, VEHICLE_EVENT, AUDIT_EVENT_TYPE } from '@mds-core/mds-types'
import { BigintTransformer } from '../transformers'
import { RecordedEntity } from './recorded-entity'

@Entity('audit_events')
export class AuditEventEntity extends RecordedEntity {
  @Column('uuid', { primary: true })
  audit_trip_id: UUID

  @Column('uuid')
  audit_event_id: UUID

  @Column('varchar', { length: 31 })
  audit_event_type: AUDIT_EVENT_TYPE | VEHICLE_EVENT

  @Column('varchar', { length: 31, nullable: true })
  audit_issue_code: string

  @Column('varchar', { length: 255 })
  audit_subject_id: string

  @Column('varchar', { length: 255, nullable: true })
  note: string

  @Column('bigint', { transformer: BigintTransformer, primary: true })
  timestamp: Timestamp

  @Column('double precision', { nullable: false })
  lat: number

  @Column('double precision', { nullable: false })
  lng: number

  @Column('real', { nullable: true })
  speed: number

  @Column('real', { nullable: true })
  heading: number

  @Column('real', { nullable: true })
  accuracy: number

  @Column('real', { nullable: true })
  altitude: number

  @Column('real', { nullable: true })
  charge: number
}
