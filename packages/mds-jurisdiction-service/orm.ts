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
import { InsertReturning, UpdateReturning } from '@mds-core/mds-orm/types'
import { DeepPartial } from 'typeorm'
import { JurisdictionRepositoryConnectionManager } from './connection-manager'
import { JurisdictionEntity } from './entities'

export const initialize = async () => {
  await JurisdictionRepositoryConnectionManager.initialize()
}

export const readJurisdiction = async (jurisdiction_id: UUID): Promise<JurisdictionEntity | undefined> => {
  const connection = await JurisdictionRepositoryConnectionManager.getReadWriteConnection()
  return connection.getRepository(JurisdictionEntity).createQueryBuilder().where({ jurisdiction_id }).getOne()
}

export const readJurisdictions = async (): Promise<JurisdictionEntity[]> => {
  const connection = await JurisdictionRepositoryConnectionManager.getReadWriteConnection()
  const entities = await connection.getRepository(JurisdictionEntity).createQueryBuilder().getMany()
  return entities
}

export const writeJurisdictions = async (
  jurisdictions: DeepPartial<JurisdictionEntity>[]
): Promise<JurisdictionEntity[]> => {
  const connection = await JurisdictionRepositoryConnectionManager.getReadWriteConnection()
  const { raw: entities }: InsertReturning<JurisdictionEntity> = await connection
    .getRepository(JurisdictionEntity)
    .createQueryBuilder()
    .insert()
    .values(jurisdictions)
    .returning('*')
    .execute()
  return entities
}

export const updateJurisdiction = async (
  jurisdiction_id: UUID,
  { id, ...jurisdiction }: JurisdictionEntity
): Promise<JurisdictionEntity> => {
  const connection = await JurisdictionRepositoryConnectionManager.getReadWriteConnection()
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

export const shutdown = async () => {
  await JurisdictionRepositoryConnectionManager.shutdown()
}
