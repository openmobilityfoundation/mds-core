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
import { parseRequest } from '@mds-core/mds-api-helpers'
import { ApiRequestQuery } from '@mds-core/mds-api-server'
import { HasJurisdictionClaim } from './utils'
import { JurisdictionApiRequest, JurisdictionApiResponse } from '../@types'

export type JurisdictionApiGetJurisdictionsRequest = JurisdictionApiRequest & ApiRequestQuery<'effective'>

export type JurisdictionApiGetJurisdictionsResponseBody = {
  jurisdictions: JurisdictionDomainModel[]
}

export type JurisdictionApiGetJurisdictionsResponse = JurisdictionApiResponse<
  JurisdictionApiGetJurisdictionsResponseBody
>

export const GetJurisdictionsHandler = async (
  req: JurisdictionApiGetJurisdictionsRequest,
  res: JurisdictionApiGetJurisdictionsResponse
) => {
  try {
    const { effective } = parseRequest(req).single({ parser: Number }).query('effective')
    const jurisdictions = await JurisdictionServiceClient.getJurisdictions({ effective })
    const { version } = res.locals
    return res.status(200).send({ version, jurisdictions: jurisdictions.filter(HasJurisdictionClaim(res)) })
  } catch (error) {
    return res.status(500).send({ error })
  }
}
