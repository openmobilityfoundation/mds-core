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
import { TransactionOperationDomainModel } from '../../@types'

export interface TransactionOperationEntityModel extends IdentityColumn, RecordedColumn {
  operation_id: TransactionOperationDomainModel['operation_id']
  transaction_id: TransactionOperationDomainModel['transaction_id']
  timestamp: TransactionOperationDomainModel['timestamp']
  operation_type: TransactionOperationDomainModel['operation_type']
  author: TransactionOperationDomainModel['author']
}

@Entity('transaction_operations')
export class TransactionOperationEntity
  extends IdentityColumn(RecordedColumn(class {}))
  implements TransactionOperationDomainModel {
  @Column('uuid', { primary: true })
  transaction_id: TransactionOperationDomainModel['transaction_id']

  @Column('uuid', { primary: true })
  operation_id: TransactionOperationDomainModel['operation_id']

  @Column('bigint', { transformer: BigintTransformer })
  timestamp: TransactionOperationDomainModel['timestamp']

  @Column('varchar', { length: 127 })
  operation_type: TransactionOperationDomainModel['operation_type']

  @Column('varchar', { length: 127 })
  author: TransactionOperationDomainModel['author']
}
