/**
 * Copyright 2021 City of Los Angeles
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
import {
  ComplianceSnapshotDomainModel,
  ComplianceViolationDomainModel,
  ComplianceViolationPeriodDomainModel,
  ComplianceViolationPeriodEntityModel
} from '../@types'
import { ComplianceSnapshotEntityModel } from './entities/compliance-snapshot-entity'
import { ComplianceViolationEntityModel } from './entities/compliance-violation-entity'

type ComplianceSnapshotEntityToDomainOptions = Partial<{}>

export const ComplianceSnapshotEntityToDomain = ModelMapper<
  ComplianceSnapshotEntityModel,
  ComplianceSnapshotDomainModel,
  ComplianceSnapshotEntityToDomainOptions
>((entity, options) => {
  const { id, recorded, policy_id, policy_name, ...domain } = entity
  return {
    policy: {
      policy_id: 'a-b-c-d', // TODO check if FIXME
      name: policy_name
    },
    ...domain
  }
})

type ComplianceSnapshotEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export type ComplianceSnapshotEntityCreateModel = Omit<
  Optional<ComplianceSnapshotEntityModel, keyof RecordedColumn>,
  keyof IdentityColumn
>

export const ComplianceSnapshotDomainToEntityCreate = ModelMapper<
  ComplianceSnapshotDomainModel,
  ComplianceSnapshotEntityCreateModel,
  ComplianceSnapshotEntityCreateOptions
>((domain, options) => {
  const { recorded } = options ?? {}
  const {
    policy: { policy_id, name: policy_name },
    ...entity
  } = domain
  return { ...entity, policy_name, policy_id, recorded }
})

export const ComplianceViolationPeriodEntityToDomainCreate = ModelMapper<
  ComplianceViolationPeriodEntityModel,
  ComplianceViolationPeriodDomainModel
>((entity, _) => {
  const { start_time, real_end_time: end_time, compliance_snapshot_ids } = entity
  return { start_time, end_time, compliance_snapshot_ids }
})

export const ComplianceViolationEntityToDomain = ModelMapper<
  ComplianceViolationEntityModel,
  ComplianceViolationDomainModel,
  Partial<{}>
>((entity, options) => {
  const { recorded, event_timestamp, device_id, trip_id, ...domain } = entity
  return {
    violation_details: {
      event_timestamp,
      device_id,
      trip_id
    },
    ...domain
  }
})

type ComplianceViolationEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export type ComplianceViolationEntityCreateModel = Omit<
  Optional<ComplianceViolationEntityModel, keyof RecordedColumn>,
  keyof IdentityColumn
>

export const ComplianceViolationDomainToEntityCreate = ModelMapper<
  ComplianceViolationDomainModel,
  ComplianceViolationEntityCreateModel,
  ComplianceViolationEntityCreateOptions
>((domain, options) => {
  const { recorded } = options ?? {}
  const {
    violation_details: { event_timestamp, device_id, trip_id },
    ...entity
  } = domain
  return { ...entity, event_timestamp, device_id, trip_id, recorded }
})
