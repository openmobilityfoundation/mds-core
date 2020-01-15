import { Column, Index } from 'typeorm'
import { BigintTransformer } from '../transformers'

export abstract class IdentityEntity {
  @Column('bigint', { generated: 'increment', transformer: BigintTransformer })
  @Index({ unique: true })
  id: number
}
