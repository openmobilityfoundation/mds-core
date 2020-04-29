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

import { UUID } from '@mds-core/mds-types'
import { InsertReturning, UpdateReturning, CreateRepository, CreateRepositoryMethod } from '@mds-core/mds-repository'

import { filterEmptyHelper, ValidationError, ConflictError, NotFoundError } from '@mds-core/mds-utils'

import { JurisdictionEntity } from './entities'
import * as migrations from './migrations'
import {
  JurisdictionDomainModel,
  GetJurisdictionsOptions,
  UpdateJurisdictionDomainModel,
  CreateJurisdictionDomainModel
} from '../../@types'
import { JurisdictionEntityToDomain, JurisdictionDomainToEntityCreate } from './mappers'

const ReadJurisdiction = CreateRepositoryMethod(
  connect => async (jurisdiction_id: UUID, options?: GetJurisdictionsOptions): Promise<JurisdictionDomainModel> => {
    const connection = await connect('ro')
    const entity = await connection.getRepository(JurisdictionEntity).findOne({ where: { jurisdiction_id } })
    if (!entity) {
      throw new NotFoundError(`Jurisdiction ${jurisdiction_id} Not Found`)
    }
    const jurisdiction = JurisdictionEntityToDomain.map(entity, options)
    if (!jurisdiction) {
      throw new NotFoundError(`Jurisdiction ${jurisdiction_id} Not Found`)
    }
    return jurisdiction
  }
)

const isEffectiveJurisdiction = filterEmptyHelper<JurisdictionDomainModel>()

const ReadJurisdictions = CreateRepositoryMethod(connect => async (options?: GetJurisdictionsOptions): Promise<
  JurisdictionDomainModel[]
> => {
  const connection = await connect('ro')
  const entities = await connection.getRepository(JurisdictionEntity).find()
  return entities.map(JurisdictionEntityToDomain.mapper(options)).filter(isEffectiveJurisdiction)
})

const CreateJurisdictions = CreateRepositoryMethod(
  connect => async (jurisdictions: CreateJurisdictionDomainModel[]): Promise<JurisdictionDomainModel[]> => {
    const connection = await connect('rw')

    const { raw: entities }: InsertReturning<JurisdictionEntity> = await connection
      .getRepository(JurisdictionEntity)
      .createQueryBuilder()
      .insert()
      .values(jurisdictions.map(JurisdictionDomainToEntityCreate.mapper()))
      .returning('*')
      .execute()

    return entities.map(JurisdictionEntityToDomain.mapper()).filter(isEffectiveJurisdiction)
  }
)

const UpdateJurisdiction = CreateRepositoryMethod(
  connect => async (jurisdiction_id: UUID, patch: UpdateJurisdictionDomainModel): Promise<JurisdictionDomainModel> => {
    const connection = await connect('rw')

    if (patch.jurisdiction_id && patch.jurisdiction_id !== jurisdiction_id) {
      throw new ConflictError(`Invalid jurisdiction_id ${patch.jurisdiction_id}. Must match ${jurisdiction_id}.`)
    }

    const entity = await connection.getRepository(JurisdictionEntity).findOne({ where: { jurisdiction_id } })
    if (!entity) {
      throw new NotFoundError(`Jurisdiction ${jurisdiction_id} Not Found`)
    }
    const { id, ...current } = entity

    const jurisdiction = JurisdictionEntityToDomain.map(entity)
    if (!jurisdiction) {
      throw new NotFoundError(`Jurisdiction ${jurisdiction_id} Not Found`)
    }

    const timestamp = patch.timestamp ?? Date.now()
    if (timestamp <= jurisdiction.timestamp) {
      throw new ValidationError(`Invalid timestamp ${timestamp}. Must be greater than ${jurisdiction.timestamp}.`)
    }

    const {
      raw: [updated]
    }: UpdateReturning<JurisdictionEntity> = await connection
      .getRepository(JurisdictionEntity)
      .createQueryBuilder()
      .update()
      .set({
        ...current,
        agency_key: patch.agency_key ?? jurisdiction.agency_key,
        versions:
          (patch.agency_name && patch.agency_name !== jurisdiction.agency_name) ||
          (patch.geography_id && patch.geography_id !== jurisdiction.geography_id)
            ? [
                {
                  agency_name: patch.agency_name ?? jurisdiction.agency_name,
                  geography_id: patch.geography_id ?? jurisdiction.geography_id,
                  timestamp
                },
                ...current.versions
              ].sort((a, b) => b.timestamp - a.timestamp)
            : current.versions
      })
      .where('jurisdiction_id = :jurisdiction_id', { jurisdiction_id })
      .returning('*')
      .execute()

    return { ...jurisdiction, ...JurisdictionEntityToDomain.map(updated) }
  }
)

const DeleteJurisdiction = CreateRepositoryMethod(connect => async (jurisdiction_id: UUID): Promise<
  Pick<JurisdictionDomainModel, 'jurisdiction_id'>
> => {
  const connection = await connect('rw')

  const entity = await connection.getRepository(JurisdictionEntity).findOne({ where: { jurisdiction_id } })
  if (!entity) {
    throw new NotFoundError(`Jurisdiction ${jurisdiction_id} Not Found`)
  }
  const { id, ...current } = entity

  const jurisdiction = JurisdictionEntityToDomain.map(entity)
  if (!jurisdiction) {
    throw new NotFoundError(`Jurisdiction ${jurisdiction_id} Not Found`)
  }

  await connection
    .getRepository(JurisdictionEntity)
    .createQueryBuilder()
    .update()
    .set({
      ...current,
      versions: [
        {
          agency_name: jurisdiction.agency_name,
          geography_id: null,
          timestamp: Date.now()
        },
        ...current.versions
      ].sort((a, b) => b.timestamp - a.timestamp)
    })
    .where('jurisdiction_id = :jurisdiction_id', { jurisdiction_id })
    .returning('*')
    .execute()

  return { jurisdiction_id }
})

export const JurisdictionRepository = CreateRepository(
  'jurisdictions',
  connect => {
    return {
      createJurisdictions: CreateJurisdictions(connect),
      deleteJurisdiction: DeleteJurisdiction(connect),
      readJurisdiction: ReadJurisdiction(connect),
      readJurisdictions: ReadJurisdictions(connect),
      updateJurisdiction: UpdateJurisdiction(connect)
    }
  },
  {
    entities: [JurisdictionEntity],
    migrations: Object.values(migrations)
  }
)
