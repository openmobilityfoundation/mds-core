import { Entity, Column } from 'typeorm'
import { UUID, Timestamp } from '@mds-core/mds-types'
import { RecordedEntity, RecordedPersistenceModel } from './recorded-entity'
import { BigintTransformer } from './transformers'
import { Nullable } from './types'

export interface TelemetryPersistenceModel extends RecordedPersistenceModel {
  device_id: UUID
  provider_id: UUID
  timestamp: Timestamp
  lat: number
  lng: number
  speed: Nullable<number>
  heading: Nullable<number>
  accuracy: Nullable<number>
  altitude: Nullable<number>
  charge: Nullable<number>
}

@Entity('telemetry')
export class TelemetryEntity extends RecordedEntity implements TelemetryPersistenceModel {
  @Column('uuid', { primary: true })
  device_id: UUID

  @Column('uuid')
  provider_id: UUID

  @Column('bigint', { primary: true, transformer: BigintTransformer })
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
