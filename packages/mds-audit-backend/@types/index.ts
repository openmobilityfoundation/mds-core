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

import { DomainModelCreate } from '@mds-core/mds-repository'
import { RpcServiceDefinition, RpcRoute } from '@mds-core/mds-rpc-common'
import { AUDIT_EVENT_TYPE, Nullable, Telemetry, Timestamp, UUID, VEHICLE_EVENT } from '@mds-core/mds-types'

export interface AuditDomainModel {
  audit_trip_id: UUID
  audit_device_id: UUID
  audit_subject_id: string
  provider_id: UUID
  provider_name: string
  provider_vehicle_id: string
  provider_device_id: Nullable<UUID>
  timestamp: Timestamp
}

export type AuditDomainCreateModel = DomainModelCreate<AuditDomainModel>

export interface AuditEventDomainModel {
  audit_trip_id: UUID
  timestamp: Timestamp
  audit_event_id: UUID
  audit_event_type: AUDIT_EVENT_TYPE | VEHICLE_EVENT
  audit_issue_code: Nullable<string>
  audit_subject_id: string
  note: Nullable<string>
  telemetry: Omit<Telemetry, 'provider_id' | 'device_id' | 'timestamp' | 'recorded'>
}

export type AuditEventDomainCreateModel = DomainModelCreate<AuditEventDomainModel>

export interface AuditAttachmentDomainModel {
  audit_trip_id: UUID
  attachment_id: UUID
}

export type AuditAttachmentDomainCreateModel = DomainModelCreate<AuditAttachmentDomainModel>

export interface AuditService {
  name: () => string
}

export const AuditServiceDefinition: RpcServiceDefinition<AuditService> = {
  name: RpcRoute<AuditService['name']>()
}
