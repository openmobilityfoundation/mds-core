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
import { TransactionDomainModel } from '../../@types'

export interface TransactionEntityModel extends IdentityColumn, RecordedColumn {
  transaction_id: TransactionDomainModel['transaction_id']
  provider_id: TransactionDomainModel['provider_id']
  device_id: TransactionDomainModel['device_id']
  timestamp: TransactionDomainModel['timestamp']
  fee_type: TransactionDomainModel['fee_type']
  amount: TransactionDomainModel['amount']
  receipt: TransactionDomainModel['receipt']
}

@Entity('transactions')
export class TransactionEntity extends IdentityColumn(RecordedColumn(class {})) implements TransactionEntityModel {
  @Column('uuid', { primary: true })
  transaction_id: TransactionEntityModel['transaction_id']

  @Column('uuid')
  provider_id: TransactionEntityModel['provider_id']

  @Column('uuid', { nullable: true })
  device_id: TransactionEntityModel['device_id']

  @Column('bigint', { transformer: BigintTransformer })
  timestamp: TransactionEntityModel['timestamp']

  @Column('varchar', { length: 127 })
  fee_type: TransactionEntityModel['fee_type']

  @Column('int')
  amount: TransactionEntityModel['amount'] // pennies or equivalent

  @Column('jsonb')
  receipt: TransactionEntityModel['receipt']
}
