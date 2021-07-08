/**
 * Copyright 2021 City of Los Angeles
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
import { Column, Entity, Index } from 'typeorm'
import { EventAnnotationDomainModel } from '../../@types'

export interface EventAnnotationEntityModel extends IdentityColumn, RecordedColumn {
  device_id: EventAnnotationDomainModel['device_id']
  timestamp: EventAnnotationDomainModel['timestamp']
  vehicle_id: EventAnnotationDomainModel['vehicle_id']
  vehicle_type: EventAnnotationDomainModel['vehicle_type']
  propulsion_types: EventAnnotationDomainModel['propulsion_types']
  geography_ids: EventAnnotationDomainModel['geography_ids']
  geography_types: EventAnnotationDomainModel['geography_types']
  latency_ms: EventAnnotationDomainModel['latency_ms']
}

@Entity('event_annotations')
export class EventAnnotationEntity
  extends IdentityColumn(RecordedColumn(class {}))
  implements EventAnnotationEntityModel
{
  @Column('uuid', { primary: true })
  device_id: EventAnnotationEntityModel['device_id']

  @Column('bigint', { transformer: BigintTransformer, primary: true })
  timestamp: EventAnnotationEntityModel['timestamp']

  @Index()
  @Column('varchar', { length: 255 })
  vehicle_id: EventAnnotationEntityModel['vehicle_id']

  @Index()
  @Column('varchar', { length: 31 })
  vehicle_type: EventAnnotationEntityModel['vehicle_type']

  @Index()
  @Column('varchar', { array: true, length: 31 })
  propulsion_types: EventAnnotationEntityModel['propulsion_types']

  @Index()
  @Column('uuid', { array: true })
  geography_ids: EventAnnotationEntityModel['geography_ids']

  @Column('varchar', { array: true, length: 255 })
  geography_types: EventAnnotationEntityModel['geography_types']

  @Column('bigint', { transformer: BigintTransformer })
  latency_ms: EventAnnotationEntityModel['latency_ms']
}
