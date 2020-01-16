import { Entity, Column } from 'typeorm'
import { UUID } from '@mds-core/mds-types'
import { IdentityEntity, IdentityModel } from './identity-entity'
import { Nullable } from './types'

export interface GeographyMetadataModel extends IdentityModel {
  geography_id: UUID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geography_metadata: Nullable<Record<string, any>>
}

@Entity('geography_metadata')
export class GeographyMetadataEntity extends IdentityEntity implements GeographyMetadataModel {
  @Column('uuid', { primary: true })
  geography_id: UUID

  @Column('json', { nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geography_metadata: Nullable<Record<string, any>>
}
