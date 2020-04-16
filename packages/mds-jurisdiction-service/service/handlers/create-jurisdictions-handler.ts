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

import { ServiceResponse, ServiceResult, ServiceError, ServiceException } from '@mds-core/mds-service-helpers'
import { ValidationError } from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'
import { v4 as uuid } from 'uuid'
import { RepositoryError } from '@mds-core/mds-repository'
import { CreateJurisdictionType, JurisdictionDomainModel } from '../../@types'
import { JursidictionMapper } from '../repository/model-mappers'
import { JurisdictionRepository } from '../repository'
import { ValidateJurisdiction } from './jurisdiction-schema-validators'

export const CreateJurisdictionsHandler = async (
  jurisdictions: CreateJurisdictionType[]
): Promise<ServiceResponse<JurisdictionDomainModel[]>> => {
  const recorded = Date.now()
  try {
    const entities = await JurisdictionRepository.writeJurisdictions(
      JursidictionMapper.fromDomainModel(
        jurisdictions.map(({ jurisdiction_id = uuid(), timestamp = recorded, ...jurisdiction }) =>
          ValidateJurisdiction({
            jurisdiction_id,
            timestamp,
            ...jurisdiction
          })
        )
      ).toEntityModel({ recorded })
    )
    const created = JursidictionMapper.fromEntityModel(entities).toDomainModel({ effective: recorded })
    return ServiceResult(created)
  } catch (error) /* istanbul ignore next */ {
    logger.error('Error Creating Jurisdictions', error)
    if (error instanceof ValidationError) {
      return ServiceError({ type: 'ValidationError', message: 'Error Creating Jurisdictions', details: error.message })
    }
    if (RepositoryError.is.uniqueViolationError(error)) {
      return ServiceError({ type: 'ConflictError', message: 'Error Creating Jurisdictions', details: error.message })
    }
    return ServiceException('Error Creating Jurisdictions', error)
  }
}
