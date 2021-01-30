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
