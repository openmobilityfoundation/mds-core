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

import { BigintTransformer, IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { Nullable, Timestamp, UUID } from '@mds-core/mds-types'
import { Column, Entity } from 'typeorm'
import { MigratedEntity } from '../mixins/migrated-entity'
@Entity('telemetry')
export class TelemetryEntity extends MigratedEntity(IdentityColumn(RecordedColumn(class {}))) {
  @Column('uuid', { primary: true })
  device_id: UUID

  @Column('uuid')
  provider_id: UUID

  @Column('bigint', { transformer: BigintTransformer, primary: true })
  timestamp: Timestamp

  @Column('double precision')
  lat: number

  @Column('double precision')
  lng: number

  @Column('real', { nullable: true })
  altitude: Nullable<number>

  @Column('real', { nullable: true })
  speed: Nullable<number>

  @Column('real', { nullable: true })
  heading: Nullable<number>

  @Column('real', { nullable: true })
  accuracy: Nullable<number>

  @Column('real', { nullable: true })
  hdop: Nullable<number>

  @Column('real', { nullable: true })
  satellites: Nullable<number>

  @Column('real', { nullable: true })
  charge: Nullable<number>

  @Column('uuid', { nullable: true })
  stop_id: Nullable<UUID>
}

export type TelemetryEntityModel = TelemetryEntity
