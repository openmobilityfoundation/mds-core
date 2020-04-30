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

import {
  UpdateJurisdictionDomainModel,
  JurisdictionServiceClient,
  JurisdictionDomainModel,
  JurisdictionIdType
} from '@mds-core/mds-jurisdiction-service'
import { HandleServiceResponse } from '@mds-core/mds-service-helpers'
import { JurisdictionApiRequest, JurisdictionApiResponse } from '../types'

interface UpdateJurisdictionRequest extends JurisdictionApiRequest<{ jurisdiction_id: JurisdictionIdType }> {
  body: UpdateJurisdictionDomainModel
}

type UpdateJurisdictionResponse = JurisdictionApiResponse<{
  jurisdiction: JurisdictionDomainModel
}>

export const UpdateJurisdictionHandler = async (req: UpdateJurisdictionRequest, res: UpdateJurisdictionResponse) => {
  const { jurisdiction_id } = req.params
  HandleServiceResponse(
    await JurisdictionServiceClient.updateJurisdiction(jurisdiction_id, req.body),
    error => {
      if (error.type === 'ValidationError') {
        return res.status(400).send({ error })
      }
      if (error.type === 'NotFoundError') {
        return res.status(404).send({ error })
      }
      if (error.type === 'ConflictError') {
        return res.status(409).send({ error })
      }
      return res.status(500).send({ error })
    },
    jurisdiction => {
      const { version } = res.locals
      return res.status(200).send({ version, jurisdiction })
    }
  )
}
