import { Entity, Column } from 'typeorm'
import { UUID, Policy } from '@mds-core/mds-types'
import { IdentityEntity, IdentityPersistenceModel } from './identity-entity'

export interface PolicyModel extends IdentityPersistenceModel {
  policy_id: UUID
  policy_json: Policy
}

@Entity('policies')
export class PolicyEntity extends IdentityEntity implements PolicyModel {
  @Column('uuid', { primary: true })
  policy_id: UUID

  @Column('json')
  policy_json: Policy
}
