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
import { Nullable, Timestamp } from '@mds-core/mds-types'
import { Column, Entity } from 'typeorm'
import { AuditDomainModel } from '../../@types'

export interface AuditEntityModel extends IdentityColumn, RecordedColumn {
  audit_trip_id: AuditDomainModel['audit_trip_id']
  audit_device_id: AuditDomainModel['audit_device_id']
  audit_subject_id: AuditDomainModel['audit_subject_id']
  provider_id: AuditDomainModel['provider_id']
  provider_name: AuditDomainModel['provider_name']
  provider_vehicle_id: AuditDomainModel['provider_vehicle_id']
  provider_device_id: AuditDomainModel['provider_device_id']
  timestamp: AuditDomainModel['timestamp']
  deleted: Nullable<Timestamp>
}

@Entity('audits')
export class AuditEntity extends IdentityColumn(RecordedColumn(class {})) implements AuditEntityModel {
  @Column('uuid', { primary: true })
  audit_trip_id: AuditEntityModel['audit_trip_id']

  @Column('uuid')
  audit_device_id: AuditEntityModel['audit_device_id']

  @Column('varchar', { length: 255 })
  audit_subject_id: AuditEntityModel['audit_subject_id']

  @Column('uuid')
  provider_id: AuditEntityModel['provider_id']

  @Column('varchar', { length: 127 })
  provider_name: AuditEntityModel['provider_name']

  @Column('varchar', { length: 255 })
  provider_vehicle_id: AuditEntityModel['provider_vehicle_id']

  @Column('uuid', { nullable: true })
  provider_device_id: AuditEntityModel['provider_device_id']

  @Column('bigint', { transformer: BigintTransformer })
  timestamp: AuditEntityModel['timestamp']

  @Column('bigint', { transformer: BigintTransformer, nullable: true })
  deleted: AuditEntityModel['deleted']
}
