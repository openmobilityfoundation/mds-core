import { Entity, Column } from 'typeorm'
import { UUID } from '@mds-core/mds-types'
import { IdentityEntity, IdentityPersistenceModel } from './identity-entity'
import { Nullable, JsonObject } from './types'

export interface PolicyMetadataPersistenceModel extends IdentityPersistenceModel {
  policy_id: UUID
  policy_metadata: Nullable<JsonObject>
}

@Entity('policy_metadata')
export class PolicyMetadataEntity extends IdentityEntity {
  @Column('uuid', { primary: true })
  policy_id: UUID

  @Column('json', { nullable: true })
  policy_metadata: Nullable<JsonObject>
}
