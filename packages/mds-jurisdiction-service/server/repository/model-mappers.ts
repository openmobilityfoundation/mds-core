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
import { filterEmptyHelper } from '@mds-core/mds-utils'
import { CreateIdentityEntityModel } from '@mds-core/mds-repository'
import { JurisdictionDomainModel } from '../../@types'
import { JurisdictionEntityModel } from './entities/jurisdiction-entity'

const isEffectiveJurisdiction = filterEmptyHelper<JurisdictionDomainModel>()

interface JurisdictionDomainModelMapperOptions {
  effective: Timestamp
}

const JurisdictionEntityModelMapper = (models: JurisdictionEntityModel[]) => ({
  toDomainModel: (options: JurisdictionDomainModelMapperOptions): JurisdictionDomainModel[] => {
    const { effective } = options
    return models
      .map<Nullable<JurisdictionDomainModel>>(model => {
        const { jurisdiction_id, agency_key, versions } = model
        const version = versions.find(properties => effective >= properties.timestamp)
        if (version) {
          const { agency_name, geography_id, timestamp } = version
          if (geography_id !== null) {
            return {
              jurisdiction_id,
              agency_key,
              agency_name,
              geography_id,
              timestamp
            }
          }
        }
        return null
      })
      .filter(isEffectiveJurisdiction)
  }
})

interface JurisdictionEntityModelMapperOptions {
  recorded: Timestamp
}

const JurisdictionDomainModelMapper = (models: JurisdictionDomainModel[]) => ({
  toEntityModel: (
    options: JurisdictionEntityModelMapperOptions
  ): CreateIdentityEntityModel<JurisdictionEntityModel>[] => {
    const { recorded } = options
    return models.map(model => {
      const { jurisdiction_id, agency_key, agency_name, geography_id, timestamp } = model
      return {
        jurisdiction_id,
        agency_key,
        versions: [{ timestamp, agency_name, geography_id }],
        recorded
      }
    })
  }
})

export const JursidictionMapper = {
  fromDomainModel: JurisdictionDomainModelMapper,
  fromEntityModel: JurisdictionEntityModelMapper
}
