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

import { InsertReturning, ReadWriteRepository, RepositoryError } from '@mds-core/mds-repository'
import { FindManyOptions, In, IsNull, MoreThan, Not } from 'typeorm'
import {
  GeographyDomainCreateModel,
  GeographyDomainModel,
  GeographyMetadataDomainCreateModel,
  GeographyMetadataDomainModel,
  GeographyWithMetadataDomainModel,
  GetGeographiesOptions,
  GetPublishedGeographiesOptions
} from '../@types'
import { GeographyEntity } from './entities/geography-entity'
import { GeographyMetadataEntity } from './entities/geography-metadata-entity'
import {
  GeographyDomainToEntityCreate,
  GeographyEntityToDomain,
  GeographyMetadataDomainToEntityCreate,
  GeographyMetadataEntityToDomain
} from './mappers'
import migrations from './migrations'

class GeographyReadWriteRepository extends ReadWriteRepository {
  protected getGeographyMetadataMap = async (
    geographies: GeographyDomainModel[]
  ): Promise<Map<GeographyDomainModel['geography_id'], GeographyMetadataDomainModel['geography_metadata']>> => {
    try {
      const connection = await this.connect('ro')
      return new Map(
        geographies.length > 0
          ? (
              await connection.getRepository(GeographyMetadataEntity).find({
                where: { geography_id: In(geographies.map(geography => geography.geography_id)) }
              })
            ).map(entity => [entity.geography_id, entity.geography_metadata])
          : []
      )
    } catch (error) /* istanbul ignore next */ {
      throw RepositoryError(error)
    }
  }

  protected findGeographies = async (
    where: FindManyOptions<GeographyEntity>['where'],
    { includeMetadata = false }: GetGeographiesOptions = {}
  ): Promise<GeographyWithMetadataDomainModel[]> => {
    try {
      const connection = await this.connect('ro')

      const entities = await connection.getRepository(GeographyEntity).find({ where })

      const geographies = entities.map(GeographyEntityToDomain.mapper())

      if (includeMetadata) {
        const metadata = await this.getGeographyMetadataMap(geographies)
        return geographies.map(geography => ({
          ...geography,
          geography_metadata: metadata.get(geography.geography_id) ?? null
        }))
      }

      return geographies
    } catch (error) /* istanbul ignore next */ {
      throw RepositoryError(error)
    }
  }

  public getGeography = async (
    geography_id: GeographyDomainModel['geography_id'],
    options: GetGeographiesOptions
  ): Promise<GeographyWithMetadataDomainModel | undefined> => {
    const [geography = undefined] = await this.findGeographies({ geography_id }, options)
    return geography
  }

  public getGeographies = async (options: GetGeographiesOptions) => this.findGeographies({}, options)

  public getUnpublishedGeographies = async (options: GetGeographiesOptions) =>
    this.findGeographies({ publish_date: IsNull() }, options)

  public getPublishedGeographies = async ({ publishedAfter, ...options }: GetPublishedGeographiesOptions) =>
    this.findGeographies(
      publishedAfter ? { publish_date: MoreThan(publishedAfter) } : { publish_date: Not(IsNull()) },
      options
    )

  public writeGeographies = async (geographies: GeographyDomainCreateModel[]): Promise<GeographyDomainModel[]> => {
    if (geographies.length > 0) {
      try {
        const connection = await this.connect('rw')

        const { raw: entities = [] }: InsertReturning<GeographyEntity> = await connection
          .getRepository(GeographyEntity)
          .createQueryBuilder()
          .insert()
          .values(geographies.map(GeographyDomainToEntityCreate.mapper()))
          .returning('*')
          .execute()
        return entities.map(GeographyEntityToDomain.mapper())
      } catch (error) {
        throw RepositoryError(error)
      }
    }
    return []
  }

  public writeGeographiesMetadata = async (
    metadata: GeographyMetadataDomainCreateModel[]
  ): Promise<GeographyMetadataDomainModel[]> => {
    if (metadata.length > 0) {
      try {
        const connection = await this.connect('rw')
        const { raw: entities = [] }: InsertReturning<GeographyMetadataEntity> = await connection
          .getRepository(GeographyMetadataEntity)
          .createQueryBuilder()
          .insert()
          .values(metadata.map(GeographyMetadataDomainToEntityCreate.mapper()))
          .onConflict('("geography_id") DO UPDATE SET "geography_metadata" = EXCLUDED."geography_metadata"')
          .returning('*')
          .execute()
        return entities.map(GeographyMetadataEntityToDomain.mapper())
      } catch (error) {
        throw RepositoryError(error)
      }
    }
    return []
  }

  constructor() {
    super('geographies', { entities: [GeographyEntity, GeographyMetadataEntity], migrations })
  }
}

export const GeographyRepository = new GeographyReadWriteRepository()
