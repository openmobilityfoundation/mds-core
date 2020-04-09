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

import { Entity, Column } from 'typeorm'
import { UUID, Timestamp, Nullable, VEHICLE_TYPE } from '@mds-core/mds-types'
import { RecordedEntityModel, RecordedEntity } from '@mds-core/mds-orm/entities'
import { BigintTransformer } from '@mds-core/mds-orm/transformers'

export interface MetricEntityModel extends RecordedEntityModel {
  name: string
  time_bin_size: Timestamp
  time_bin_start: Timestamp
  provider_id: UUID
  geography_id: Nullable<UUID>
  vehicle_type: VEHICLE_TYPE
  count: number
  sum: number
  min: number
  max: number
  avg: number
}

@Entity('metrics')
export class MetricEntity extends RecordedEntity implements MetricEntityModel {
  @Column('varchar', { primary: true, length: 255 })
  name: string

  @Column('bigint', { primary: true, transformer: BigintTransformer })
  time_bin_size: Timestamp

  @Column('bigint', { primary: true, transformer: BigintTransformer })
  time_bin_start: Timestamp

  @Column('uuid', { primary: true })
  provider_id: UUID

  @Column('uuid', { primary: true, nullable: true })
  geography_id: Nullable<UUID>

  @Column('varchar', { primary: true, length: 31 })
  vehicle_type: VEHICLE_TYPE

  @Column('bigint', { transformer: BigintTransformer })
  count: number

  @Column('double precision')
  sum: number

  @Column('double precision')
  min: number

  @Column('double precision')
  max: number

  @Column('double precision')
  avg: number
}
