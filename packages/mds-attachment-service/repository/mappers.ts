import { Optional, Timestamp } from '@mds-core/mds-types'
import { IdentityColumn, ModelMapper, RecordedColumn } from '@mds-core/mds-repository'
import { AttachmentEntityModel } from './entities/attachment-entity'
import { AttachmentDomainCreateModel, AttachmentDomainModel } from '../@types'

type AttachmentEntityToDomainOptions = Partial<{}>

export const AttachmentEntityToDomain = ModelMapper<
  AttachmentEntityModel,
  AttachmentDomainModel,
  AttachmentEntityToDomainOptions
>((entity, options) => {
  const { id, ...domain } = entity
  return { ...domain }
})

type AttachmentEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export type AttachmentEntityCreateModel = Omit<
  Optional<AttachmentEntityModel, keyof RecordedColumn>,
  keyof IdentityColumn
>

export const AttachmentDomainToEntityCreate = ModelMapper<
  AttachmentDomainCreateModel,
  AttachmentEntityCreateModel,
  AttachmentEntityCreateOptions
>(({ thumbnail_filename = null, thumbnail_mimetype = null, attachment_list_id = null, ...domain }, options) => {
  const { recorded } = options ?? {}
  return { thumbnail_filename, thumbnail_mimetype, attachment_list_id, ...domain, recorded }
})
