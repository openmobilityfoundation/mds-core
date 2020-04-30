/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { Entity, Column, Index } from 'typeorm'
import { UUID, Timestamp, Nullable, VEHICLE_TYPE } from '@mds-core/mds-types'
import {
  BigintTransformer,
  IdentityEntity,
  IdentityEntityModel,
  RecordedEntity,
  RecordedEntityModel
} from '@mds-core/mds-repository'

export interface MetricEntityModel extends IdentityEntityModel, RecordedEntityModel {
  name: string
  time_bin_size: Timestamp
  time_bin_start: Timestamp
  provider_id: Nullable<UUID>
  geography_id: Nullable<UUID>
  vehicle_type: Nullable<VEHICLE_TYPE>
  count: Nullable<number>
  sum: Nullable<number>
  min: Nullable<number>
  max: Nullable<number>
  avg: Nullable<number>
}

@Entity('metrics')
@Index(
  'idx_dimensions_metrics',
  ['name', 'time_bin_size', 'time_bin_start', 'provider_id', 'vehicle_type', 'geography_id'],
  { unique: true }
)
export class MetricEntity extends IdentityEntity(RecordedEntity(class {}), { primary: true })
  implements MetricEntityModel {
  @Column('varchar', { primary: true, length: 255 })
  name: string

  @Column('bigint', { primary: true, transformer: BigintTransformer })
  time_bin_size: Timestamp

  @Column('bigint', { primary: true, transformer: BigintTransformer })
  time_bin_start: Timestamp

  @Column('uuid', { nullable: true })
  provider_id: Nullable<UUID>

  @Column('uuid', { nullable: true })
  geography_id: Nullable<UUID>

  @Column('varchar', { length: 31, nullable: true })
  vehicle_type: Nullable<VEHICLE_TYPE>

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  count: Nullable<number>

  @Column('double precision', { nullable: true })
  sum: Nullable<number>

  @Column('double precision', { nullable: true })
  min: Nullable<number>

  @Column('double precision', { nullable: true })
  max: Nullable<number>

  @Column('double precision', { nullable: true })
  avg: Nullable<number>
}
