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

import { IdentityColumn, ModelMapper } from '@mds-core/mds-repository'
import {
  PolicyDomainCreateModel,
  PolicyDomainModel,
  PolicyMetadataDomainCreateModel,
  PolicyMetadataDomainModel
} from '../@types'
import { PolicyEntityModel } from './entities/policy-entity'
import { PolicyMetadataEntityModel } from './entities/policy-metadata-entity'

type PolicyEntityToDomainOptions = Partial<{}>

export const PolicyEntityToDomain = ModelMapper<PolicyEntityModel, PolicyDomainModel, PolicyEntityToDomainOptions>(
  (entity, options) => {
    const { policy_json: domain } = entity
    return { ...domain }
  }
)

type PolicyEntityCreateOptions = Partial<{}>

export type PolicyEntityCreateModel = Omit<PolicyEntityModel, keyof IdentityColumn>

export const PolicyDomainToEntityCreate = ModelMapper<
  PolicyDomainCreateModel,
  PolicyEntityCreateModel,
  PolicyEntityCreateOptions
>(({ provider_ids = null, end_date = null, prev_policies = null, publish_date = null, ...domain }, options) => {
  const { policy_id } = domain
  return { policy_id, policy_json: { provider_ids, end_date, prev_policies, publish_date, ...domain } }
})

type PolicyMetadataEntityToDomainOptions = Partial<{}>

export const PolicyMetadataEntityToDomain = ModelMapper<
  PolicyMetadataEntityModel,
  PolicyMetadataDomainModel,
  PolicyMetadataEntityToDomainOptions
>((entity, options) => {
  const { id, policy_metadata = null, ...domain } = entity
  return { policy_metadata, ...domain }
})

type PolicyMetadataEntityCreateOptions = Partial<{}>

export type PolicyMetadataEntityCreateModel = Omit<PolicyMetadataEntityModel, keyof IdentityColumn>

export const PolicyMetadataDomainToEntityCreate = ModelMapper<
  PolicyMetadataDomainCreateModel,
  PolicyMetadataEntityCreateModel,
  PolicyMetadataEntityCreateOptions
>(({ policy_metadata = null, ...domain }, options) => {
  return { policy_metadata, ...domain }
})
