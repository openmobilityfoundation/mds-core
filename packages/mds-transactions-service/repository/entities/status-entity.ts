import { Entity, Column } from 'typeorm'
import { BigintTransformer, IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { TransactionStatusDomainModel } from '../../@types'

export interface TransactionStatusEntityModel extends IdentityColumn, RecordedColumn {
  status_id: TransactionStatusDomainModel['status_id']
  transaction_id: TransactionStatusDomainModel['transaction_id']
  timestamp: TransactionStatusDomainModel['timestamp']
  status_type: TransactionStatusDomainModel['status_type']
  author: TransactionStatusDomainModel['author']
}

@Entity('transaction_statuses')
export class TransactionStatusEntity
  extends IdentityColumn(RecordedColumn(class {}))
  implements TransactionStatusDomainModel {
  @Column('uuid', { primary: true })
  transaction_id: TransactionStatusDomainModel['transaction_id']

  @Column('uuid', { primary: true })
  status_id: TransactionStatusDomainModel['status_id']

  @Column('bigint', { transformer: BigintTransformer })
  timestamp: TransactionStatusDomainModel['timestamp']

  @Column('varchar', { length: 127 })
  status_type: TransactionStatusDomainModel['status_type']

  @Column('varchar', { length: 127 })
  author: TransactionStatusDomainModel['author'] // is this how you specify a JSON blob?
}
