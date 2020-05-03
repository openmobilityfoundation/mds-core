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
import { HandleServiceResponse } from '@mds-core/mds-service-helpers'
import { parseRequest } from '@mds-core/mds-api-helpers'
import { ApiQuery } from '@mds-core/mds-api-server'
import { HasJurisdictionClaim } from './utils'
import { JurisdictionApiRequest, JurisdictionApiResponse } from '../@types'

type GetJurisdictionsRequest = JurisdictionApiRequest & ApiQuery<'effective'>

type GetJurisdictionsResponse = JurisdictionApiResponse<{
  jurisdictions: JurisdictionDomainModel[]
}>

export const GetJurisdictionsHandler = async (req: GetJurisdictionsRequest, res: GetJurisdictionsResponse) => {
  const { effective } = parseRequest(req, { parser: Number }).query('effective')
  HandleServiceResponse(
    await JurisdictionServiceClient.getJurisdictions({ effective }),
    error => {
      return res.status(500).send({ error })
    },
    jurisdictions => {
      const { version } = res.locals
      return res.status(200).send({ version, jurisdictions: jurisdictions.filter(HasJurisdictionClaim(res)) })
    }
  )
}
