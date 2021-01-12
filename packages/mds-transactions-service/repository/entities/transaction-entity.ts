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
