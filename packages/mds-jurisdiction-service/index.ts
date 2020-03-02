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

import { UUID, Timestamp, Jurisdiction } from '@mds-core/mds-types'
import { ConnectionManager } from '@mds-core/mds-orm'
import { NotFoundError, ServerError, ConflictError, ValidationError } from '@mds-core/mds-utils'
import { DeepPartial } from 'typeorm'
import { InsertReturning } from '@mds-core/mds-orm/types'
import logger from '@mds-core/mds-logger'
import { validateJurisdiction } from '@mds-core/mds-schema-validators'
import { v4 as uuid } from 'uuid'
import { JurisdictionEntity } from './entities'
import ormconfig from './ormconfig'

type JurisdictionServiceResult<TResult, TError extends Error> = [null, TResult] | [TError | ServerError, null]

const Success = <TResult>(result: TResult): JurisdictionServiceResult<TResult, never> => [null, result]
const Failure = <TError extends Error>(error: TError | ServerError): JurisdictionServiceResult<never, TError> => [
  error,
  null
]

interface GetJurisdictionOptions {
  effective: Timestamp
}

const manager = ConnectionManager(ormconfig)

const initialize = async () => manager.initialize()

const AsJurisdiction = (effective: Timestamp = Date.now()) => (
  entity: JurisdictionEntity | undefined
): Jurisdiction | null => {
  if (entity) {
    const { jurisdiction_id, agency_key, versions } = entity
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
  }
  return null
}

export type CreateJurisdictionType = Partial<Pick<Jurisdiction, 'jurisdiction_id' | 'timestamp'>> &
  Pick<Jurisdiction, 'agency_key' | 'agency_name' | 'geography_id'>

const AsJurisdictionEntity = (jurisdiction: CreateJurisdictionType): DeepPartial<JurisdictionEntity> => {
  const recorded = Date.now()
  const { jurisdiction_id = uuid(), agency_key, agency_name, geography_id, timestamp = recorded } = jurisdiction
  validateJurisdiction({ jurisdiction_id, agency_key, agency_name, geography_id, timestamp })
  const entity: DeepPartial<JurisdictionEntity> = {
    jurisdiction_id,
    agency_key,
    versions: [{ timestamp, agency_name, geography_id }],
    recorded
  }
  return entity
}

const createJurisdictions = async (
  jurisdictions: CreateJurisdictionType[]
): Promise<JurisdictionServiceResult<Jurisdiction[], ValidationError | ConflictError>> => {
  try {
    const connection = await manager.getReadWriteConnection()
    try {
      const { raw: entities }: InsertReturning<JurisdictionEntity> = await connection
        .getRepository(JurisdictionEntity)
        .createQueryBuilder()
        .insert()
        .values(jurisdictions.map(AsJurisdictionEntity))
        .returning('*')
        .execute()
      return Success(
        entities.map(AsJurisdiction()).filter((jurisdiction): jurisdiction is Jurisdiction => jurisdiction !== null)
      )
    } catch (error) {
      await logger.error(error.message)
      return Failure(error instanceof ValidationError ? error : new ConflictError(error))
    }
  } catch (error) {
    return Failure(error instanceof ServerError ? error : new ServerError(error))
  }
}

const createJurisdiction = async (
  jurisdiction: CreateJurisdictionType
): Promise<JurisdictionServiceResult<Jurisdiction, ValidationError | ConflictError>> => {
  const [error, jurisdictions] = await createJurisdictions([jurisdiction])
  return error || !jurisdictions ? Failure(error ?? new ServerError()) : Success(jurisdictions[0])
}

const getAllJurisdictions = async ({
  effective = Date.now()
}: Partial<GetJurisdictionOptions> = {}): Promise<JurisdictionServiceResult<Jurisdiction[], ServerError>> => {
  try {
    const connection = await manager.getReadOnlyConnection()
    try {
      const entities = await connection
        .getRepository(JurisdictionEntity)
        .createQueryBuilder()
        .getMany()
      const jurisdictions = entities
        .map(AsJurisdiction(effective))
        .filter((jurisdiction): jurisdiction is Jurisdiction => jurisdiction !== null)
      return Success(jurisdictions)
    } catch (error) {
      await logger.error(error.message)
      return Failure(error)
    }
  } catch (error) {
    return Failure(error instanceof ServerError ? error : new ServerError(error))
  }
}

const getOneJurisdiction = async (
  jurisdiction_id: UUID,
  { effective = Date.now() }: Partial<GetJurisdictionOptions> = {}
): Promise<JurisdictionServiceResult<Jurisdiction, NotFoundError>> => {
  try {
    const connection = await manager.getReadOnlyConnection()
    try {
      const entity = await connection
        .getRepository(JurisdictionEntity)
        .createQueryBuilder()
        .where({ jurisdiction_id })
        .getOne()
      const [jurisdiction] = [entity].map(AsJurisdiction(effective))
      return jurisdiction
        ? Success(jurisdiction)
        : Failure(new NotFoundError('Jurisdiction Not Found', { jurisdiction_id, effective }))
    } catch (error) {
      await logger.error(error.message, error)
      return Failure(error)
    }
  } catch (error) {
    return Failure(error instanceof ServerError ? error : new ServerError(error))
  }
}

const shutdown = async () => manager.shutdown()

export const JurisdictionService = {
  initialize,
  createJurisdictions,
  createJurisdiction,
  getAllJurisdictions,
  getOneJurisdiction,
  shutdown
}
