import { Entity, Column } from 'typeorm'
import { UUID } from '@mds-core/mds-types'
import { IdentityEntity } from './identity-entity'

@Entity('geography_metadata')
export class GeographyMetadataEntity extends IdentityEntity {
  @Column('uuid', { primary: true })
  geography_id: UUID

  @Column('json', { nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geography_metadata: Record<string, any>
}
