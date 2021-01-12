import { Optional, Timestamp } from '@mds-core/mds-types'
import { IdentityColumn, ModelMapper, RecordedColumn } from '@mds-core/mds-repository'
import { TransactionEntityModel } from './entities/transaction-entity'
import { TransactionOperationEntityModel } from './entities/operation-entity'
import { TransactionStatusEntityModel } from './entities/status-entity'
import {
  TransactionDomainCreateModel,
  TransactionDomainModel,
  TransactionOperationDomainCreateModel,
  TransactionOperationDomainModel,
  TransactionStatusDomainCreateModel,
  TransactionStatusDomainModel
} from '../@types'

type TransactionEntityToDomainOptions = Partial<{}>

export const TransactionEntityToDomain = ModelMapper<
  TransactionEntityModel,
  TransactionDomainModel,
  TransactionEntityToDomainOptions
>((entity, options) => {
  const { id, recorded, ...domain } = entity
  return domain
})

type TransactionOperationEntityToDomainOptions = Partial<{}>

export const TransactionOperationEntityToDomain = ModelMapper<
  TransactionOperationEntityModel,
  TransactionOperationDomainModel,
  TransactionOperationEntityToDomainOptions
>((entity, options) => {
  const { id, recorded, ...domain } = entity
  return domain
})

type TransactionStatusEntityToDomainOptions = Partial<{}>

export const TransactionStatusEntityToDomain = ModelMapper<
  TransactionStatusEntityModel,
  TransactionStatusDomainModel,
  TransactionStatusEntityToDomainOptions
>((entity, options) => {
  const { id, recorded, ...domain } = entity
  return domain
})

type TransactionEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export type TransactionEntityCreateModel = Omit<
  Optional<TransactionEntityModel, keyof RecordedColumn>,
  keyof IdentityColumn
>

export const TransactionDomainToEntityCreate = ModelMapper<
  TransactionDomainCreateModel,
  TransactionEntityCreateModel,
  TransactionEntityCreateOptions
>(({ device_id = null, ...domain }, options) => {
  const { recorded } = options ?? {}
  return { ...domain, device_id, recorded }
})

export type TransactionOperationEntityCreateModel = Omit<
  Optional<TransactionOperationEntityModel, keyof RecordedColumn>,
  keyof IdentityColumn
>

type TransactionOperationEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export const TransactionOperationDomainToEntityCreate = ModelMapper<
  TransactionOperationDomainCreateModel,
  TransactionOperationEntityCreateModel,
  TransactionOperationEntityCreateOptions
>((domain, options) => {
  const { recorded } = options ?? {}
  return { ...domain, recorded }
})

export type TransactionStatusEntityCreateModel = Omit<
  Optional<TransactionStatusEntityModel, keyof RecordedColumn>,
  keyof IdentityColumn
>

type TransactionStatusEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export const TransactionStatusDomainToEntityCreate = ModelMapper<
  TransactionStatusDomainCreateModel,
  TransactionStatusEntityCreateModel,
  TransactionStatusEntityCreateOptions
>((domain, options) => {
  const { recorded } = options ?? {}
  return { ...domain, recorded }
})
