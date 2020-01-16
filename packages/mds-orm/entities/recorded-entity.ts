import { Column, Index } from 'typeorm'
import { Timestamp } from '@mds-core/mds-types'
import { BigintTransformer } from './transformers'
import { IdentityEntity, IdentityModel } from './identity-entity'

export interface RecordedModel extends IdentityModel {
  recorded: Timestamp
}

export abstract class RecordedEntity extends IdentityEntity implements RecordedModel {
  @Column('bigint', { transformer: BigintTransformer })
  @Index()
  recorded: Timestamp
}
