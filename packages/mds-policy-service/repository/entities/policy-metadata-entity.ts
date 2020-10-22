import { IdentityColumn } from '@mds-core/mds-repository'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { PolicyMetadataDomainModel } from '../../@types'
import { PolicyEntity } from './policy-entity'

export interface PolicyMetadataEntityModel extends IdentityColumn {
  policy_id: PolicyMetadataDomainModel['policy_id']
  policy_metadata: PolicyMetadataDomainModel['policy_metadata']
}

@Entity('policy_metadata')
export class PolicyMetadataEntity extends IdentityColumn(class {}) implements PolicyMetadataEntityModel {
  @Column('uuid', { primary: true })
  // Use ManyToOne since the PK already enforces OneToOne behavior and the extra unique constraint is unnecessary
  @ManyToOne(type => PolicyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policy_id' })
  policy_id: PolicyMetadataEntityModel['policy_id']

  @Column('json', { nullable: true })
  policy_metadata: PolicyMetadataEntityModel['policy_metadata']
}
