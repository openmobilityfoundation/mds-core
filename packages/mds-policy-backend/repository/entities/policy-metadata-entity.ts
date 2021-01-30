/**
 * Copyright 2020 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
