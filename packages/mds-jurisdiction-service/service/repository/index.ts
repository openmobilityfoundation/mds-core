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

import { InsertReturning, UpdateReturning, ReadWriteRepository } from '@mds-core/mds-repository'

import { ValidationError, ConflictError, NotFoundError, filterDefined } from '@mds-core/mds-utils'

import { JurisdictionEntity } from './entities'
import * as migrations from './migrations'
import {
  JurisdictionDomainModel,
  GetJurisdictionsOptions,
  UpdateJurisdictionDomainModel,
  CreateJurisdictionDomainModel,
  JurisdictionIdType
} from '../../@types'
import { JurisdictionEntityToDomain, JurisdictionDomainToEntityCreate } from './mappers'

class JurisdictionReadWriteRepository extends ReadWriteRepository {
  public createJurisdictions = async (
    jurisdictions: CreateJurisdictionDomainModel[]
  ): Promise<JurisdictionDomainModel[]> => {
    const connection = await this.connect('rw')

    const { raw: entities }: InsertReturning<JurisdictionEntity> = await connection
      .getRepository(JurisdictionEntity)
      .createQueryBuilder()
      .insert()
      .values(jurisdictions.map(JurisdictionDomainToEntityCreate.mapper()))
      .returning('*')
      .execute()

    return entities.map(JurisdictionEntityToDomain.mapper()).filter(filterDefined())
  }

  public deleteJurisdiction = async (
    jurisdiction_id: JurisdictionIdType
  ): Promise<Pick<JurisdictionDomainModel, 'jurisdiction_id'>> => {
    const connection = await this.connect('rw')

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
  }

  public readJurisdiction = async (
    jurisdiction_id: JurisdictionIdType,
    options?: GetJurisdictionsOptions
  ): Promise<JurisdictionDomainModel> => {
    const connection = await this.connect('ro')
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

  public readJurisdictions = async (options?: GetJurisdictionsOptions): Promise<JurisdictionDomainModel[]> => {
    const connection = await this.connect('ro')
    const entities = await connection.getRepository(JurisdictionEntity).find()
    return entities.map(JurisdictionEntityToDomain.mapper(options)).filter(filterDefined())
  }

  public updateJurisdiction = async (
    jurisdiction_id: JurisdictionIdType,
    patch: UpdateJurisdictionDomainModel
  ): Promise<JurisdictionDomainModel> => {
    const connection = await this.connect('rw')

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

  constructor() {
    super('jurisdictions', {
      entities: [JurisdictionEntity],
      migrations: Object.values(migrations)
    })
  }
}

export const JurisdictionRepository = new JurisdictionReadWriteRepository()
