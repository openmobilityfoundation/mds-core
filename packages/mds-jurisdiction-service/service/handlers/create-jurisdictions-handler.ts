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

import { ServiceResponse, ServiceResult, ServiceException } from '@mds-core/mds-service-helpers'
import logger from '@mds-core/mds-logger'
import { CreateJurisdictionDomainModel, JurisdictionDomainModel } from '../../@types'
import { JurisdictionRepository } from '../repository'
import { ValidateJurisdictionForCreate } from '../validators'

export const createJurisdictions = async (
  models: CreateJurisdictionDomainModel[]
): Promise<ServiceResponse<JurisdictionDomainModel[]>> => {
  try {
    const jurisdictions = await JurisdictionRepository.createJurisdictions(models.map(ValidateJurisdictionForCreate))
    return ServiceResult(jurisdictions)
  } catch (error) /* istanbul ignore next */ {
    const exception = ServiceException('Error Creating Jurisdictions', error)
    logger.error(exception, error)
    return exception
  }
}
