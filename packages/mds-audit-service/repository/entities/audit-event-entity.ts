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
import { BigintTransformer, IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { AuditEventDomainModel } from '../../@types'

export interface AuditEventEntityModel extends IdentityColumn, RecordedColumn {
  audit_trip_id: AuditEventDomainModel['audit_trip_id']
  timestamp: AuditEventDomainModel['timestamp']
  audit_event_id: AuditEventDomainModel['audit_event_id']
  audit_event_type: AuditEventDomainModel['audit_event_type']
  audit_issue_code: AuditEventDomainModel['audit_issue_code']
  audit_subject_id: AuditEventDomainModel['audit_subject_id']
  note: AuditEventDomainModel['note']
  lat: AuditEventDomainModel['telemetry']['gps']['lat']
  lng: AuditEventDomainModel['telemetry']['gps']['lng']
  speed: Required<AuditEventDomainModel['telemetry']['gps']>['speed']
  heading: Required<AuditEventDomainModel['telemetry']['gps']>['heading']
  accuracy: Required<AuditEventDomainModel['telemetry']['gps']>['accuracy']
  altitude: Required<AuditEventDomainModel['telemetry']['gps']>['altitude']
  charge: Required<AuditEventDomainModel['telemetry']>['charge']
}

@Entity('audit_events')
export class AuditEventEntity extends IdentityColumn(RecordedColumn(class {})) implements AuditEventEntityModel {
  @Column('uuid', { primary: true })
  audit_trip_id: AuditEventEntityModel['audit_trip_id']

  @Column('bigint', { transformer: BigintTransformer, primary: true })
  timestamp: AuditEventEntityModel['timestamp']

  @Column('uuid')
  audit_event_id: AuditEventEntityModel['audit_event_id']

  @Column('varchar', { length: 31 })
  audit_event_type: AuditEventEntityModel['audit_event_type']

  @Column('varchar', { length: 31, nullable: true })
  audit_issue_code: AuditEventEntityModel['audit_issue_code']

  @Column('varchar', { length: 255 })
  audit_subject_id: AuditEventEntityModel['audit_subject_id']

  @Column('varchar', { length: 255, nullable: true })
  note: AuditEventEntityModel['note']

  @Column('double precision')
  lat: AuditEventEntityModel['lat']

  @Column('double precision')
  lng: AuditEventEntityModel['lng']

  @Column('real', { nullable: true })
  speed: AuditEventEntityModel['speed']

  @Column('real', { nullable: true })
  heading: AuditEventEntityModel['heading']

  @Column('real', { nullable: true })
  accuracy: AuditEventEntityModel['accuracy']

  @Column('real', { nullable: true })
  altitude: AuditEventEntityModel['altitude']

  @Column('real', { nullable: true })
  charge: AuditEventEntityModel['charge']
}
