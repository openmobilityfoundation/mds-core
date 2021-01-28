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

import { Entity, Column } from 'typeorm'
import { IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { DeviceDomainModel } from '../../@types'

export interface DeviceEntityModel extends IdentityColumn, RecordedColumn {
  device_id: DeviceDomainModel['device_id']
  provider_id: DeviceDomainModel['provider_id']
  vehicle_id: DeviceDomainModel['vehicle_id']
  type: DeviceDomainModel['type']
  propulsion: DeviceDomainModel['propulsion']
  year: DeviceDomainModel['year']
  mfgr: DeviceDomainModel['mfgr']
  model: DeviceDomainModel['model']
}

@Entity('devices')
export class DeviceEntity extends IdentityColumn(RecordedColumn(class {})) implements DeviceEntityModel {
  @Column('uuid', { primary: true })
  device_id: DeviceEntityModel['device_id']

  @Column('uuid')
  provider_id: DeviceEntityModel['provider_id']

  @Column('varchar', { length: 255 })
  vehicle_id: DeviceEntityModel['vehicle_id']

  @Column('varchar', { length: 31 })
  type: DeviceEntityModel['type']

  @Column('varchar', { array: true, length: 31 })
  propulsion: DeviceEntityModel['propulsion']

  @Column('smallint', { nullable: true })
  year: DeviceEntityModel['year']

  @Column('varchar', { length: 127, nullable: true })
  mfgr: DeviceEntityModel['mfgr']

  @Column('varchar', { length: 127, nullable: true })
  model: DeviceEntityModel['model']
}
