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
import {
  BigintTransformer,
  IdentityEntity,
  IdentityEntityModel,
  RecordedEntity,
  RecordedEntityModel
} from '@mds-core/mds-repository'
import { MetricDomainModel } from '../../../@types'

export interface MetricEntityModel extends IdentityEntityModel, RecordedEntityModel {
  name: MetricDomainModel['name']
  time_bin_size: MetricDomainModel['time_bin_size']
  time_bin_start: MetricDomainModel['time_bin_start']
  provider_id: MetricDomainModel['provider_id']
  geography_id: MetricDomainModel['geography_id']
  vehicle_type: MetricDomainModel['vehicle_type']
  count: MetricDomainModel['count']
  sum: MetricDomainModel['sum']
  min: MetricDomainModel['min']
  max: MetricDomainModel['max']
  avg: MetricDomainModel['avg']
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
  name: MetricEntityModel['name']

  @Column('bigint', { primary: true, transformer: BigintTransformer })
  time_bin_size: MetricEntityModel['time_bin_size']

  @Column('bigint', { primary: true, transformer: BigintTransformer })
  time_bin_start: MetricEntityModel['time_bin_start']

  @Column('uuid', { nullable: true })
  provider_id: MetricEntityModel['provider_id']

  @Column('uuid', { nullable: true })
  geography_id: MetricEntityModel['geography_id']

  @Column('varchar', { length: 31, nullable: true })
  vehicle_type: MetricEntityModel['vehicle_type']

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  count: MetricEntityModel['count']

  @Column('double precision', { nullable: true })
  sum: MetricEntityModel['sum']

  @Column('double precision', { nullable: true })
  min: MetricEntityModel['min']

  @Column('double precision', { nullable: true })
  max: MetricEntityModel['max']

  @Column('double precision', { nullable: true })
  avg: MetricEntityModel['avg']
}
