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
  JurisdictionServiceClient,
  CreateJurisdictionType,
  JurisdictionDomainModel
} from '@mds-core/mds-jurisdiction-service'
import { ValidationError, ConflictError } from '@mds-core/mds-utils'
import { JurisdictionApiRequest, JurisdictionApiResponse } from '../types'
import { UnexpectedServiceError } from './utils'

interface CreateJurisdictionRequest extends JurisdictionApiRequest {
  body: CreateJurisdictionType | CreateJurisdictionType[]
}

type CreateJurisdictionResponse = JurisdictionApiResponse<
  | {
      jurisdiction: JurisdictionDomainModel
    }
  | {
      jurisdictions: JurisdictionDomainModel[]
    }
>

export const CreateJurisdictionHandler = async (req: CreateJurisdictionRequest, res: CreateJurisdictionResponse) => {
  const [error, jurisdictions] = await JurisdictionServiceClient.createJurisdictions(
    Array.isArray(req.body) ? req.body : [req.body]
  )

  // Handle result
  if (jurisdictions) {
    if (!Array.isArray(req.body)) {
      const [jurisdiction] = jurisdictions
      return res.status(201).send({ version: res.locals.version, jurisdiction })
    }
    return res.status(201).send({ version: res.locals.version, jurisdictions })
  }

  // Handle errors
  if (error instanceof ValidationError) {
    return res.status(400).send({ error })
  }
  if (error instanceof ConflictError) {
    return res.status(409).send({ error })
  }

  return res.status(500).send({ error: UnexpectedServiceError(error) })
}
