import { Entity, Column } from 'typeorm'
import { UUID, Timestamp } from '@mds-core/mds-types'
import { FeatureCollection } from 'geojson'
import { IdentityEntity, IdentityPersistenceModel } from './identity-entity'
import { BigintTransformer } from './transformers'
import { Nullable } from './types'

export interface GeographyPersistenceModel extends IdentityPersistenceModel {
  description: Nullable<string>
  effective_date: Nullable<Timestamp>
  geography_id: UUID
  geography_json: FeatureCollection
  publish_date: Nullable<string>
  prev_geographies: Nullable<UUID[]>
  name: Nullable<string>
}

@Entity('geographies')
export class GeographyEntity extends IdentityEntity implements GeographyPersistenceModel {
  @Column('varchar', { length: 255, nullable: true })
  description: Nullable<string>

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  effective_date: Nullable<Timestamp>

  @Column('uuid', { primary: true })
  geography_id: UUID

  @Column('json')
  geography_json: FeatureCollection

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  publish_date: Nullable<string>

  @Column('uuid', { array: true, nullable: true })
  prev_geographies: Nullable<UUID[]>

  @Column('varchar', { length: 255, nullable: true })
  name: Nullable<string>
}
