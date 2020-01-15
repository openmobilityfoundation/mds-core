import { Entity, Column } from 'typeorm'
import { UUID, Timestamp } from '@mds-core/mds-types'
import { FeatureCollection } from 'geojson'
import { IdentityEntity } from './identity-entity'
import { BigintTransformer } from '../transformers'

@Entity('geographies')
export class GeographyEntity extends IdentityEntity {
  @Column('varchar', { length: 255, nullable: true })
  description: string

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  effective_date: Timestamp

  @Column('uuid', { primary: true })
  geography_id: UUID

  @Column('json')
  geography_json: FeatureCollection

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  publish_date: string

  @Column('uuid', { array: true, nullable: true })
  prev_geographies: UUID[]

  @Column('varchar', { length: 255, nullable: true })
  name: string
}
