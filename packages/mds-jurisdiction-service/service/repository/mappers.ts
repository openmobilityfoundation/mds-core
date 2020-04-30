/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { Timestamp, Nullable } from '@mds-core/mds-types'
import { IdentityEntityCreateModel, ModelMapper, RecordedEntityCreateModel } from '@mds-core/mds-repository'
import { uuid } from '@mds-core/mds-utils'
import { JurisdictionDomainModel, CreateJurisdictionDomainModel } from '../../@types'
import { JurisdictionEntityModel } from './entities/jurisdiction-entity'

type MapJurisdictionEntityToDomainModelOptions = Partial<{
  effective: Timestamp
}>

export const JurisdictionEntityToDomain = ModelMapper<
  JurisdictionEntityModel,
  Nullable<JurisdictionDomainModel>,
  MapJurisdictionEntityToDomainModelOptions
>((entity, options) => {
  const { effective = Date.now() } = options ?? {}
  const { jurisdiction_id, agency_key, versions } = entity
  const version = versions.find(properties => effective >= properties.timestamp)
  if (version) {
    const { agency_name, geography_id, timestamp } = version
    if (geography_id !== null) {
      const domain = {
        jurisdiction_id,
        agency_key,
        agency_name,
        geography_id,
        timestamp
      }
      return domain
    }
  }
  return null
})

type JurisdictionDomainToEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export const JurisdictionDomainToEntityCreate = ModelMapper<
  CreateJurisdictionDomainModel,
  RecordedEntityCreateModel<IdentityEntityCreateModel<JurisdictionEntityModel>>,
  JurisdictionDomainToEntityCreateOptions
>((domain, options) => {
  const { recorded } = options ?? {}
  const { jurisdiction_id = uuid(), agency_key, agency_name, geography_id, timestamp = Date.now() } = domain
  const entity = {
    jurisdiction_id,
    agency_key,
    versions: [{ timestamp, agency_name, geography_id }],
    recorded
  }
  return entity
})
