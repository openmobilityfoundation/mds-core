import { IdentityColumn } from '@mds-core/mds-repository'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { GeographyMetadataDomainModel } from '../../@types'
import { GeographyEntity } from './geography-entity'

export interface GeographyMetadataEntityModel extends IdentityColumn {
  geography_id: GeographyMetadataDomainModel['geography_id']
  geography_metadata: GeographyMetadataDomainModel['geography_metadata']
}

@Entity('geography_metadata')
export class GeographyMetadataEntity extends IdentityColumn(class {}) implements GeographyMetadataEntityModel {
  @Column('uuid', { primary: true })
  // Use ManyToOne since the PK already enforces OneToOne behavior and the extra unique constraint is unnecessary
  @ManyToOne(type => GeographyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'geography_id' })
  geography_id: GeographyMetadataEntityModel['geography_id']

  @Column('json', { nullable: true })
  geography_metadata: GeographyMetadataEntityModel['geography_metadata']
}
