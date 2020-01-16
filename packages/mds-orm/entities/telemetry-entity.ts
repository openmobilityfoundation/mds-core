import { Entity, Column } from 'typeorm'
import { UUID, Timestamp } from '@mds-core/mds-types'
import { RecordedEntity } from './recorded-entity'
import { BigintTransformer } from '../transformers'

@Entity('telemetry')
export class TelemetryEntity extends RecordedEntity {
  @Column('uuid', { primary: true, nullable: false })
  device_id: UUID

  @Column('uuid', { nullable: false })
  provider_id: UUID

  @Column('bigint', { primary: true, transformer: BigintTransformer, nullable: false })
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
