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

import { Optional, Timestamp } from '@mds-core/mds-types'
import { IdentityColumn, ModelMapper, RecordedColumn } from '@mds-core/mds-repository'
import { AuditEventEntityModel } from '../entities/audit-event-entity'
import { AuditEventDomainCreateModel, AuditEventDomainModel } from '../../@types'

type AuditEventEntityToDomainOptions = Partial<{}>

export const AuditEventEntityToDomain = ModelMapper<
  AuditEventEntityModel,
  AuditEventDomainModel,
  AuditEventEntityToDomainOptions
>((entity, options) => {
  const { id, recorded, lat, lng, speed, heading, accuracy, altitude, charge, ...domain } = entity
  return { telemetry: { gps: { lat, lng, speed, heading, accuracy, altitude }, charge }, ...domain }
})

type AuditEventEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export type AuditEventEntityCreateModel = Omit<
  Optional<AuditEventEntityModel, keyof RecordedColumn>,
  keyof IdentityColumn
>

export const AuditEventDomainToEntityCreate = ModelMapper<
  AuditEventDomainCreateModel,
  AuditEventEntityCreateModel,
  AuditEventEntityCreateOptions
>(({ audit_issue_code = null, note = null, telemetry, ...domain }, options) => {
  const {
    charge = null,
    gps: { lat, lng, speed = null, heading = null, accuracy = null, altitude = null }
  } = telemetry
  const { recorded } = options ?? {}
  return { audit_issue_code, note, lat, lng, speed, heading, accuracy, altitude, charge, ...domain, recorded }
})
