import { Optional, Timestamp } from '@mds-core/mds-types'
import { IdentityColumn, ModelMapper, RecordedColumn } from '@mds-core/mds-repository'
import { AuditAttachmentEntityModel } from '../entities/audit-attachment-entity'
import { AuditAttachmentDomainCreateModel, AuditAttachmentDomainModel } from '../../@types'

type AuditAttachmentEntityToDomainOptions = Partial<{}>

export const AuditAttachmentEntityToDomain = ModelMapper<
  AuditAttachmentEntityModel,
  AuditAttachmentDomainModel,
  AuditAttachmentEntityToDomainOptions
>((entity, options) => {
  const { id, recorded, ...domain } = entity
  return { ...domain }
})

type AuditAttachmentEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export type AuditAttachmentEntityCreateModel = Omit<
  Optional<AuditAttachmentEntityModel, keyof RecordedColumn>,
  keyof IdentityColumn
>

export const AuditAttachmentDomainToEntityCreate = ModelMapper<
  AuditAttachmentDomainCreateModel,
  AuditAttachmentEntityCreateModel,
  AuditAttachmentEntityCreateOptions
>((domain, options) => {
  const { recorded } = options ?? {}
  return { ...domain, recorded }
})
