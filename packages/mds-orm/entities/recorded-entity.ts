import { Column, Index } from 'typeorm'
import { Timestamp } from '@mds-core/mds-types'
import { BigintTransformer } from '../transformers'
import { IdentityEntity } from './identity-entity'

export abstract class RecordedEntity extends IdentityEntity {
  @Column('bigint', { transformer: BigintTransformer })
  @Index()
  recorded: Timestamp
}
