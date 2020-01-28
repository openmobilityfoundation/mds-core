import { Column, Index } from 'typeorm'
import { BigintTransformer } from './transformers'

export interface IdentityPersistenceModel {
  id: number
}

export abstract class IdentityEntity implements IdentityPersistenceModel {
  @Column('bigint', { generated: 'increment', transformer: BigintTransformer })
  @Index({ unique: true })
  id: number
}
