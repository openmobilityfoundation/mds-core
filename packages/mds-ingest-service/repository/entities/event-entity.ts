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
import { Nullable } from '@mds-core/mds-types'
import { Column, Entity, Index } from 'typeorm'
import { EventDomainModel } from '../../@types'
import { TelemetryEntity, TelemetryEntityModel } from './telemetry-entity'

export interface EventEntityModel extends IdentityColumn, RecordedColumn {
  device_id: EventDomainModel['device_id']
  provider_id: EventDomainModel['provider_id']
  timestamp: EventDomainModel['timestamp']
  event_types: EventDomainModel['event_types']
  vehicle_state: EventDomainModel['vehicle_state']
  trip_state: EventDomainModel['trip_state']
  telemetry_timestamp: EventDomainModel['telemetry_timestamp']
  trip_id: EventDomainModel['trip_id']
  service_area_id: EventDomainModel['service_area_id']
  telemetry?: Nullable<TelemetryEntityModel>
}

@Entity('events')
export class EventEntity extends IdentityColumn(RecordedColumn(class {})) implements EventEntityModel {
  @Column('uuid', { primary: true })
  device_id: EventEntityModel['device_id']

  @Column('uuid')
  provider_id: EventEntityModel['provider_id']

  @Column('bigint', { transformer: BigintTransformer, primary: true })
  timestamp: EventEntityModel['timestamp']

  @Column('varchar', { array: true, length: 31 })
  event_types: EventEntityModel['event_types']

  @Column('varchar', { length: 31 })
  vehicle_state: EventEntityModel['vehicle_state']

  @Column('varchar', { length: 31, nullable: true })
  trip_state: EventEntityModel['trip_state']

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  telemetry_timestamp: EventEntityModel['telemetry_timestamp']

  @Index()
  @Column('uuid', { nullable: true })
  trip_id: EventEntityModel['trip_id']

  @Column('uuid', { nullable: true })
  service_area_id: EventEntityModel['service_area_id']

  telemetry?: TelemetryEntity
}
