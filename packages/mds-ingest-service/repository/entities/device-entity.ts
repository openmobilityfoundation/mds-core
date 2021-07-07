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

import { IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { ACCESSIBILITY_OPTION, MODALITY, Nullable, PROPULSION_TYPE, UUID, VEHICLE_TYPE } from '@mds-core/mds-types'
import { Column, Entity } from 'typeorm'
import { MigratedEntity } from '../mixins/migrated-entity'

@Entity('devices')
export class DeviceEntity extends MigratedEntity(IdentityColumn(RecordedColumn(class {}))) {
  @Column('uuid', { primary: true })
  device_id: UUID

  @Column('uuid')
  provider_id: UUID

  @Column('varchar', { length: 255 })
  vehicle_id: string

  @Column('varchar', { length: 31 })
  vehicle_type: VEHICLE_TYPE

  @Column('varchar', { array: true, length: 31 })
  propulsion_types: PROPULSION_TYPE[]

  @Column('smallint', { nullable: true })
  year: Nullable<number>

  @Column('varchar', { length: 127, nullable: true })
  mfgr: Nullable<string>

  @Column('varchar', { length: 127, nullable: true })
  model: Nullable<string>

  @Column('varchar', { array: true, length: 255 })
  accessibility_options: Nullable<ACCESSIBILITY_OPTION[]>

  @Column('varchar', { length: 255 })
  modality: MODALITY
}

export type DeviceEntityModel = DeviceEntity
