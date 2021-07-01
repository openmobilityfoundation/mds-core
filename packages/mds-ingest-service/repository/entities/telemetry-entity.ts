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

export interface TelemetryEntityModel extends IdentityColumn, RecordedColumn {
  device_id: UUID
  provider_id: UUID
  timestamp: Timestamp
  lat: number
  lng: number
  altitude: Nullable<number>
  heading: Nullable<number>
  speed: Nullable<number>
  accuracy: Nullable<number>
  hdop: Nullable<number>
  satellites: Nullable<number>
  charge: Nullable<number>
  stop_id: Nullable<UUID>
}

@Entity('telemetry')
export class TelemetryEntity extends IdentityColumn(RecordedColumn(class {})) implements TelemetryEntityModel {
  @Column('uuid', { primary: true })
  device_id: TelemetryEntityModel['device_id']

  @Column('uuid')
  provider_id: TelemetryEntityModel['provider_id']

  @Column('bigint', { transformer: BigintTransformer, primary: true })
  timestamp: TelemetryEntityModel['timestamp']

  @Column('double precision')
  lat: TelemetryEntityModel['lat']

  @Column('double precision')
  lng: TelemetryEntityModel['lng']

  @Column('real', { nullable: true })
  altitude: TelemetryEntityModel['altitude']

  @Column('real', { nullable: true })
  speed: TelemetryEntityModel['speed']

  @Column('real', { nullable: true })
  heading: TelemetryEntityModel['heading']

  @Column('real', { nullable: true })
  accuracy: TelemetryEntityModel['accuracy']

  @Column('real', { nullable: true })
  hdop: TelemetryEntityModel['hdop']

  @Column('real', { nullable: true })
  satellites: TelemetryEntityModel['satellites']

  @Column('real', { nullable: true })
  charge: TelemetryEntityModel['charge']

  @Column('uuid', { nullable: true })
  stop_id: TelemetryEntityModel['stop_id']
}
