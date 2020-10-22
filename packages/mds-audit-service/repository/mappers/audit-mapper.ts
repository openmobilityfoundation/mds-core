import { Optional, Timestamp } from '@mds-core/mds-types'
import { IdentityColumn, ModelMapper, RecordedColumn } from '@mds-core/mds-repository'
import { AuditEntityModel } from '../entities/audit-entity'
import { AuditDomainCreateModel, AuditDomainModel } from '../../@types'

type AuditEntityToDomainOptions = Partial<{}>

export const AuditEntityToDomain = ModelMapper<AuditEntityModel, AuditDomainModel, AuditEntityToDomainOptions>(
  (entity, options) => {
    const { id, recorded, deleted, ...domain } = entity
    return { ...domain }
  }
)

type AuditEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export type AuditEntityCreateModel = Omit<Optional<AuditEntityModel, keyof RecordedColumn>, keyof IdentityColumn>

export const AuditDomainToEntityCreate = ModelMapper<
  AuditDomainCreateModel,
  AuditEntityCreateModel,
  AuditEntityCreateOptions
>(({ provider_device_id = null, ...domain }, options) => {
  const { recorded } = options ?? {}
  return { deleted: null, provider_device_id, ...domain, recorded }
})
