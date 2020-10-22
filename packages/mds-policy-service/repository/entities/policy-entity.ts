import { Entity, Column } from 'typeorm'
import { IdentityColumn } from '@mds-core/mds-repository'
import { PolicyDomainModel } from '../../@types'

export interface PolicyEntityModel extends IdentityColumn {
  policy_id: PolicyDomainModel['policy_id']
  policy_json: PolicyDomainModel
}

@Entity('policies')
export class PolicyEntity extends IdentityColumn(class {}) implements PolicyEntityModel {
  @Column('uuid', { primary: true })
  policy_id: PolicyEntityModel['policy_id']

  @Column('json')
  policy_json: PolicyEntityModel['policy_json']
}
