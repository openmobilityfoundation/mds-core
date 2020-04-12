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
import { DeepPartial } from 'typeorm'

import { JurisdictionEntity } from './entities'
import * as migrations from './migrations'

const RepositoryReadJurisdiction = CreateRepositoryMethod(connect => async (jurisdiction_id: UUID): Promise<
  JurisdictionEntity | undefined
> => {
  const connection = await connect('ro')
  return connection.getRepository(JurisdictionEntity).findOne({ where: { jurisdiction_id } })
})

const RepositoryReadJurisdictions = CreateRepositoryMethod(connect => async (): Promise<JurisdictionEntity[]> => {
  const connection = await connect('ro')
  const entities = await connection.getRepository(JurisdictionEntity).find()
  return entities
})

const RepositoryWriteJurisdictions = CreateRepositoryMethod(
  connect => async (jurisdictions: DeepPartial<JurisdictionEntity>[]): Promise<JurisdictionEntity[]> => {
    const connection = await connect('rw')
    const { raw: entities }: InsertReturning<JurisdictionEntity> = await connection
      .getRepository(JurisdictionEntity)
      .createQueryBuilder()
      .insert()
      .values(jurisdictions)
      .returning('*')
      .execute()
    return entities
  }
)

const RepositoryUpdateJurisdiction = CreateRepositoryMethod(
  connect => async (
    jurisdiction_id: UUID,
    { id, ...jurisdiction }: JurisdictionEntity
  ): Promise<JurisdictionEntity> => {
    const connection = await connect('rw')
    const {
      raw: [entity]
    }: UpdateReturning<JurisdictionEntity> = await connection
      .getRepository(JurisdictionEntity)
      .createQueryBuilder()
      .update()
      .set(jurisdiction)
      .where('jurisdiction_id = :jurisdiction_id', { jurisdiction_id })
      .returning('*')
      .execute()
    return entity
  }
)

export const JurisdictionRepository = CreateRepository(
  'jurisdiction-repository',
  connect => {
    return {
      readJurisdiction: RepositoryReadJurisdiction(connect),
      readJurisdictions: RepositoryReadJurisdictions(connect),
      writeJurisdictions: RepositoryWriteJurisdictions(connect),
      updateJurisdiction: RepositoryUpdateJurisdiction(connect)
    }
  },
  {
    entities: [JurisdictionEntity],
    migrations: Object.values(migrations),
    migrationsTableName: 'migrations_jurisdictions'
  }
)
