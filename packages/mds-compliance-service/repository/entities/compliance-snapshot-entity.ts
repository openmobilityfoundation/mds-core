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

import { Entity, Column } from 'typeorm'
import { BigintTransformer, IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { ComplianceSnapshotDomainModel } from '../../@types'

export interface ComplianceSnapshotEntityModel extends IdentityColumn, RecordedColumn {
  compliance_snapshot_id: ComplianceSnapshotDomainModel['compliance_snapshot_id']
  compliance_as_of: ComplianceSnapshotDomainModel['compliance_as_of']
  provider_id: ComplianceSnapshotDomainModel['provider_id']
  policy_name: ComplianceSnapshotDomainModel['policy']['name']
  policy_id: ComplianceSnapshotDomainModel['policy']['policy_id']
  excess_vehicles_count: ComplianceSnapshotDomainModel['excess_vehicles_count']
  total_violations: ComplianceSnapshotDomainModel['total_violations']
  vehicles_found: ComplianceSnapshotDomainModel['vehicles_found']
}

@Entity('compliance_snapshots')
export class ComplianceSnapshotEntity
  extends IdentityColumn(RecordedColumn(class {}))
  implements ComplianceSnapshotEntityModel {
  @Column('uuid', { primary: true })
  compliance_snapshot_id: ComplianceSnapshotEntityModel['compliance_snapshot_id']

  @Column('bigint', { transformer: BigintTransformer })
  compliance_as_of: ComplianceSnapshotEntityModel['compliance_as_of']

  @Column('uuid')
  provider_id: ComplianceSnapshotEntityModel['provider_id']

  @Column('varchar', { length: 255 })
  policy_name: ComplianceSnapshotEntityModel['policy_name']

  @Column('uuid')
  policy_id: ComplianceSnapshotEntityModel['policy_id']

  @Column('int')
  excess_vehicles_count: ComplianceSnapshotEntityModel['excess_vehicles_count']

  @Column('int')
  total_violations: ComplianceSnapshotEntityModel['total_violations']

  @Column('jsonb')
  vehicles_found: ComplianceSnapshotEntityModel['vehicles_found']
}
