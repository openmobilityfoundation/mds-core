import { Column, Index } from 'typeorm'
import { Timestamp } from '@mds-core/mds-types'
import { BigintTransformer } from './transformers'
import { IdentityEntity, IdentityPersistenceModel } from './identity-entity'

export interface RecordedPersistenceModel extends IdentityPersistenceModel {
  recorded: Timestamp
}

export abstract class RecordedEntity extends IdentityEntity implements RecordedPersistenceModel {
  @Column('bigint', { transformer: BigintTransformer })
  @Index()
  recorded: Timestamp
}
