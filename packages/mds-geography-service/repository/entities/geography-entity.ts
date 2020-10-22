import { Entity, Column, Index } from 'typeorm'
import { BigintTransformer, IdentityColumn } from '@mds-core/mds-repository'
import { GeographyDomainModel } from '../../@types'

export interface GeographyEntityModel extends IdentityColumn {
  geography_id: GeographyDomainModel['geography_id']
  name: GeographyDomainModel['name']
  description: GeographyDomainModel['description']
  effective_date: GeographyDomainModel['effective_date']
  publish_date: GeographyDomainModel['publish_date']
  prev_geographies: GeographyDomainModel['prev_geographies']
  geography_json: GeographyDomainModel['geography_json']
}

@Entity('geographies')
export class GeographyEntity extends IdentityColumn(class {}) implements GeographyEntityModel {
  @Column('uuid', { primary: true })
  geography_id: GeographyEntityModel['geography_id']

  @Column('varchar', { length: 255, nullable: true })
  name: GeographyEntityModel['name']

  @Column('varchar', { length: 255, nullable: true })
  description: GeographyEntityModel['description']

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  effective_date: GeographyEntityModel['effective_date']

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  @Index()
  publish_date: GeographyEntityModel['publish_date']

  @Column('uuid', { array: true, nullable: true })
  prev_geographies: GeographyEntityModel['prev_geographies']

  @Column('json')
  geography_json: GeographyEntityModel['geography_json']
}
