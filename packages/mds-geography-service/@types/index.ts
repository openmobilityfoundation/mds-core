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
import { RpcRoute, RpcServiceDefinition } from '@mds-core/mds-rpc-common'
import { Nullable, Timestamp, UUID } from '@mds-core/mds-types'
import { FeatureCollection } from 'geojson'

export interface GeographyDomainModel {
  geography_id: UUID
  name: Nullable<string>
  description: Nullable<string>
  effective_date: Nullable<Timestamp>
  publish_date: Nullable<Timestamp>
  prev_geographies: Nullable<UUID[]>
  geography_json: FeatureCollection
}

export type GeographyDomainCreateModel = DomainModelCreate<GeographyDomainModel>

export interface GeographyMetadataDomainModel<M extends {} = {}> {
  geography_id: UUID
  geography_metadata: Nullable<M>
}

export type GeographyMetadataDomainCreateModel = DomainModelCreate<GeographyMetadataDomainModel>

export type GetGeographiesOptions = Partial<{
  includeMetadata: boolean
}>

export type GetPublishedGeographiesOptions = GetGeographiesOptions &
  Partial<{
    publishedAfter: Timestamp
  }>

export type GeographyWithMetadataDomainModel<M extends {} = {}> = GeographyDomainModel &
  Partial<Pick<GeographyMetadataDomainModel<M>, 'geography_metadata'>>

export interface GeographyService {
  getGeography: (
    geography_id: GeographyDomainModel['geography_id'],
    options?: GetGeographiesOptions
  ) => GeographyWithMetadataDomainModel | undefined
  getGeographies: (options?: GetGeographiesOptions) => GeographyWithMetadataDomainModel[]
  getUnpublishedGeographies: (options?: GetGeographiesOptions) => GeographyWithMetadataDomainModel[]
  getPublishedGeographies: (options?: GetPublishedGeographiesOptions) => GeographyWithMetadataDomainModel[]
  writeGeographies: (geographies: GeographyDomainCreateModel[]) => GeographyDomainModel[]
  writeGeographiesMetadata: (metadata: GeographyMetadataDomainCreateModel[]) => GeographyMetadataDomainModel[]
}

export const GeographyServiceDefinition: RpcServiceDefinition<GeographyService> = {
  getGeography: RpcRoute<GeographyService['getGeography']>(),
  getGeographies: RpcRoute<GeographyService['getGeographies']>(),
  getUnpublishedGeographies: RpcRoute<GeographyService['getUnpublishedGeographies']>(),
  getPublishedGeographies: RpcRoute<GeographyService['getPublishedGeographies']>(),
  writeGeographies: RpcRoute<GeographyService['writeGeographies']>(),
  writeGeographiesMetadata: RpcRoute<GeographyService['writeGeographiesMetadata']>()
}
