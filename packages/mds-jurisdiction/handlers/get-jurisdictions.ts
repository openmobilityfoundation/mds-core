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

import { JurisdictionServiceClient } from '@mds-core/mds-jurisdiction-service'
import { Jurisdiction } from '@mds-core/mds-types'
import { HasJurisdictionClaim, UnexpectedServiceError } from './utils'
import { JurisdictionApiRequest, JurisdictionApiResponse } from '../types'

interface GetJurisdictionsRequest extends JurisdictionApiRequest {
  // Query string parameters always come in as strings
  query: Partial<
    {
      [P in 'effective']: string
    }
  >
}

type GetJurisdictionsResponse = JurisdictionApiResponse<{
  jurisdictions: Jurisdiction[]
}>

export const GetAllJurisdictionsHandler = async (req: GetJurisdictionsRequest, res: GetJurisdictionsResponse) => {
  const { effective } = req.query

  const [error, jurisdictions] = await JurisdictionServiceClient.getJurisdictions({
    effective: effective ? Number(effective) : undefined
  })

  // Handle result
  if (jurisdictions) {
    return res.status(200).send({
      version: res.locals.version,
      jurisdictions: jurisdictions.filter(HasJurisdictionClaim(res))
    })
  }

  // Handle errors
  return res.status(500).send({ error: UnexpectedServiceError(error) })
}
