import { Column, Index } from 'typeorm'
import { BigintTransformer } from './transformers'

export interface IdentityModel {
  id: number
}

export abstract class IdentityEntity implements IdentityModel {
  @Column('bigint', { generated: 'increment', transformer: BigintTransformer })
  @Index({ unique: true })
  id: number
}
