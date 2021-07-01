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
import { AuditDomainCreateModel, AuditDomainModel } from '../../@types'
import { AuditEntityModel } from '../entities/audit-entity'

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
