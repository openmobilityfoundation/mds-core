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
import { AttachmentDomainCreateModel, AttachmentDomainModel } from '../@types'
import { AttachmentEntityModel } from './entities/attachment-entity'

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
