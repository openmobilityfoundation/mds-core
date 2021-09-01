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
import { PROPULSION_TYPE, Timestamp, UUID, VEHICLE_TYPE } from '@mds-core/mds-types'
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm'
import { EventEntity, EventEntityModel } from './event-entity'

@Entity('event_annotations')
export class EventAnnotationEntity extends IdentityColumn(RecordedColumn(class {})) {
  @Column('uuid', { primary: true })
  device_id: UUID

  @Column('bigint', { transformer: BigintTransformer, primary: true })
  timestamp: Timestamp

  @Index()
  @Column('varchar', { length: 255 })
  vehicle_id: string

  @Index()
  @Column('varchar', { length: 31 })
  vehicle_type: VEHICLE_TYPE

  @Index()
  @Column('varchar', { array: true, length: 31 })
  propulsion_types: PROPULSION_TYPE[]

  @Index()
  @Column('uuid', { array: true })
  geography_ids: UUID[]

  @Column('varchar', { array: true, length: 255 })
  geography_types: (string | null)[]

  @Column('bigint', { transformer: BigintTransformer })
  latency_ms: Timestamp

  @OneToOne(() => EventEntity, event => event.annotation, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'events_row_id', referencedColumnName: 'id' })
  event: EventEntityModel

  @Column('bigint', { transformer: BigintTransformer })
  @Index()
  events_row_id: number
}

export type EventAnnotationEntityModel = EventAnnotationEntity
