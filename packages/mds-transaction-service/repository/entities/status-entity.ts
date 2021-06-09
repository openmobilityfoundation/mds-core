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
import { Timestamp } from '@mds-core/mds-types'
import { TransactionStatusDomainModel, TRANSACTION_STATUS_TYPE } from '../../@types'

@Entity('transaction_statuses')
export class TransactionStatusEntity
  extends IdentityColumn(RecordedColumn(class {}))
  implements TransactionStatusDomainModel
{
  @Column('uuid', { primary: true })
  transaction_id: string

  @Column('uuid', { primary: true })
  status_id: string

  @Column('bigint', { transformer: BigintTransformer })
  timestamp: Timestamp

  @Column('varchar', { length: 127 })
  status_type: TRANSACTION_STATUS_TYPE

  @Column('varchar', { length: 127 })
  author: string
}
