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

import { JurisdictionServiceClient, JurisdictionDomainModel } from '@mds-core/mds-jurisdiction-service'
import { UUID } from '@mds-core/mds-types'
import { NotFoundError } from '@mds-core/mds-utils'
import { JurisdictionApiRequest, JurisdictionApiResponse } from '../types'
import { UnexpectedServiceError } from './utils'

type DeleteJurisdictionRequest = JurisdictionApiRequest<{ jurisdiction_id: UUID }>

type DeleteJurisdictionResponse = JurisdictionApiResponse<Pick<JurisdictionDomainModel, 'jurisdiction_id'>>

export const DeleteJurisdictionHandler = async (req: DeleteJurisdictionRequest, res: DeleteJurisdictionResponse) => {
  const [error, result] = await JurisdictionServiceClient.deleteJurisdiction(req.params.jurisdiction_id)

  // Handle result
  if (result) {
    return res.status(200).send({ version: res.locals.version, ...result })
  }

  // Handle errors
  if (error instanceof NotFoundError) {
    return res.status(404).send({ error })
  }

  return res.status(500).send({ error: UnexpectedServiceError(error) })
}
