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
import { JurisdictionServiceClient, JurisdictionDomainModel } from '@mds-core/mds-jurisdiction-service'
import { AuthorizationError } from '@mds-core/mds-utils'
import { JurisdictionApiResponse, JurisdictionApiRequest } from '../types'
import { HasJurisdictionClaim, UnexpectedServiceError } from './utils'

type GetJurisdictionRequest = JurisdictionApiRequest<{ jurisdiction_id: UUID }, Partial<'effective'>>

type GetJurisdictionResponse = JurisdictionApiResponse<{
  jurisdiction: JurisdictionDomainModel
}>

export const GetOneJurisdictionHandler = async (req: GetJurisdictionRequest, res: GetJurisdictionResponse) => {
  const { effective } = req.query
  const { jurisdiction_id } = req.params

  const [error, jurisdiction] = await JurisdictionServiceClient.getJurisdiction(jurisdiction_id, {
    effective: effective ? Number(effective) : undefined
  })

  // Handle result
  if (jurisdiction) {
    return HasJurisdictionClaim(res)(jurisdiction)
      ? res.status(200).send({
          version: res.locals.version,
          jurisdiction
        })
      : res.status(403).send({ error: new AuthorizationError('Access Denied', { jurisdiction_id }) })
  }

  // Handle errors
  if (error) {
    if (error.type === 'NotFoundError') {
      return res.status(404).send({ error })
    }
    return res.status(500).send({ error })
  }

  return res.status(500).send(UnexpectedServiceError)
}
