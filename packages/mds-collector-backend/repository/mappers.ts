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

import { Timestamp } from '@mds-core/mds-types'
import { ModelMapper } from '@mds-core/mds-repository'
import {
  CollectorMessageDomainCreateModel,
  CollectorMessageDomainModel,
  CollectorSchemaDomainCreateModel,
  CollectorSchemaDomainModel
} from '../@types'
import {
  CollectorMessageEntityCreateModel,
  CollectorMessageEntityModel,
  CollectorSchemaEntityCreateModel,
  CollectorSchemaEntityModel
} from './entities'

type CollectorSchemaEntityCreateOptions = Partial<{ recorded: Timestamp }>

export const CollectorSchemaDomainToEntityCreate = ModelMapper<
  CollectorSchemaDomainCreateModel,
  CollectorSchemaEntityCreateModel,
  CollectorSchemaEntityCreateOptions
>((domain, options) => {
  const { recorded } = options ?? {}
  const entity = { recorded, ...domain }
  return entity
})

export const CollectorSchemaEntityToDomain = ModelMapper<CollectorSchemaEntityModel, CollectorSchemaDomainModel>(
  (entity, options) => {
    const { id, recorded, ...domain } = entity
    return domain
  }
)

type CollectorMessageEntityCreateOptions = Partial<{ recorded: Timestamp }>

export const CollectorMessageDomainToEntityCreate = ModelMapper<
  CollectorMessageDomainCreateModel,
  CollectorMessageEntityCreateModel,
  CollectorMessageEntityCreateOptions
>((domain, options) => {
  const { recorded } = options ?? {}
  const entity = { recorded, ...domain }
  return entity
})

export const CollectorMessageEntityToDomain = ModelMapper<CollectorMessageEntityModel, CollectorMessageDomainModel>(
  (entity, options) => {
    const { id, ...domain } = entity
    return domain
  }
)
