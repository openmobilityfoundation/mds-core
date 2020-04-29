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

import { Timestamp } from '@mds-core/mds-types'
import { IdentityEntityCreateModel, ModelMapper, RecordedEntityCreateModel } from '@mds-core/mds-repository'
import { MetricEntityModel } from './entities/metric-entity'
import { MetricDomainModel } from '../../@types'

export const MetricEntityToDomain = ModelMapper<MetricEntityModel, MetricDomainModel>((model, options) => {
  const { id, recorded, ...domain } = model
  return domain
})

type MetricDomainToEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export const MetricDomainToEntityCreate = ModelMapper<
  MetricDomainModel,
  RecordedEntityCreateModel<IdentityEntityCreateModel<MetricEntityModel>>,
  MetricDomainToEntityCreateOptions
>((model, options) => {
  const { recorded } = options ?? {}
  const entity = { ...model, recorded }
  return entity
})
