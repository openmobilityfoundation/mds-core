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
import { Column, Entity } from 'typeorm'
import { ComplianceViolationDomainModel } from '../../@types'

export interface ComplianceViolationEntityModel extends IdentityColumn, RecordedColumn {
  violation_id: ComplianceViolationDomainModel['violation_id']
  timestamp: ComplianceViolationDomainModel['timestamp']
  policy_id: ComplianceViolationDomainModel['policy_id'] // TODO check/fix
  provider_id: ComplianceViolationDomainModel['provider_id']
  rule_id: ComplianceViolationDomainModel['rule_id']
  event_timestamp: ComplianceViolationDomainModel['violation_details']['event_timestamp']
  device_id: ComplianceViolationDomainModel['violation_details']['device_id']
  trip_id: ComplianceViolationDomainModel['violation_details']['trip_id']
}

@Entity('compliance_violations')
export class ComplianceViolationEntity
  extends IdentityColumn(RecordedColumn(class {}))
  implements ComplianceViolationEntityModel
{
  @Column('uuid', { primary: true })
  violation_id: ComplianceViolationEntityModel['violation_id']

  @Column('bigint', { transformer: BigintTransformer })
  timestamp: ComplianceViolationEntityModel['timestamp']

  @Column('uuid')
  policy_id: ComplianceViolationEntityModel['policy_id']

  @Column('uuid')
  provider_id: ComplianceViolationEntityModel['provider_id']

  @Column('uuid')
  rule_id: ComplianceViolationEntityModel['rule_id']

  @Column('bigint', { transformer: BigintTransformer })
  event_timestamp: ComplianceViolationEntityModel['event_timestamp']

  @Column('uuid')
  device_id: ComplianceViolationEntityModel['device_id']

  @Column('uuid')
  trip_id: ComplianceViolationEntityModel['trip_id']
}
