import { Entity, Column } from 'typeorm'
import { UUID } from '@mds-core/mds-types'
import { IdentityEntity, IdentityModel } from './identity-entity'
import { Nullable, JsonObject } from './types'

export interface GeographyMetadataModel extends IdentityModel {
  geography_id: UUID
  geography_metadata: Nullable<JsonObject>
}

@Entity('geography_metadata')
export class GeographyMetadataEntity extends IdentityEntity implements GeographyMetadataModel {
  @Column('uuid', { primary: true })
  geography_id: UUID

  @Column('json', { nullable: true })
  geography_metadata: Nullable<JsonObject>
}
