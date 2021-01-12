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
