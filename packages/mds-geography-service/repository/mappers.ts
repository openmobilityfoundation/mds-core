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
  GeographyDomainCreateModel,
  GeographyDomainModel,
  GeographyMetadataDomainCreateModel,
  GeographyMetadataDomainModel
} from '../@types'
import { GeographyEntityModel } from './entities/geography-entity'
import { GeographyMetadataEntityModel } from './entities/geography-metadata-entity'

type GeographyEntityToDomainOptions = Partial<{}>

export const GeographyEntityToDomain = ModelMapper<
  GeographyEntityModel,
  GeographyDomainModel,
  GeographyEntityToDomainOptions
>((entity, options) => {
  const { id, ...domain } = entity
  return domain
})

type GeographyEntityCreateOptions = Partial<{}>

export type GeographyEntityCreateModel = Omit<GeographyEntityModel, keyof IdentityColumn>

export const GeographyDomainToEntityCreate = ModelMapper<
  GeographyDomainCreateModel,
  GeographyEntityCreateModel,
  GeographyEntityCreateOptions
>(
  (
    { name = null, description = null, effective_date = null, publish_date = null, prev_geographies = null, ...domain },
    options
  ) => {
    return { name, description, effective_date, publish_date, prev_geographies, ...domain }
  }
)

type GeographyMetadataEntityToDomainOptions = Partial<{}>

export const GeographyMetadataEntityToDomain = ModelMapper<
  GeographyMetadataEntityModel,
  GeographyMetadataDomainModel,
  GeographyMetadataEntityToDomainOptions
>((entity, options) => {
  const { id, ...domain } = entity
  return domain
})

type GeographyMetadataEntityCreateOptions = Partial<{}>

export type GeographyMetadataEntityCreateModel = Omit<GeographyMetadataEntityModel, keyof IdentityColumn>

export const GeographyMetadataDomainToEntityCreate = ModelMapper<
  GeographyMetadataDomainCreateModel,
  GeographyMetadataEntityCreateModel,
  GeographyMetadataEntityCreateOptions
>(({ geography_metadata = null, ...domain }, options) => {
  return { geography_metadata, ...domain }
})
