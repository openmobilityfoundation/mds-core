/**
 * Copyright 2020 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { IdentityColumn, ModelMapper, RecordedColumn } from '@mds-core/mds-repository'
import { Optional, Timestamp } from '@mds-core/mds-types'
import { AuditAttachmentDomainCreateModel, AuditAttachmentDomainModel } from '../../@types'
import { AuditAttachmentEntityModel } from '../entities/audit-attachment-entity'

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
