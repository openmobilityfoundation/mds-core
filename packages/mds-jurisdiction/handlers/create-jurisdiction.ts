import { CreateJurisdictionType, JurisdictionService } from '@mds-core/mds-jurisdiction-service'
import { Jurisdiction } from '@mds-core/mds-types'
import { ValidationError, ConflictError } from '@mds-core/mds-utils'
import { JurisdictionApiRequest, JurisdictionApiResponse } from '../types'
import { UnexpectedServiceError } from './utils'

interface CreateJurisdictionRequest extends JurisdictionApiRequest {
  body: CreateJurisdictionType | CreateJurisdictionType[]
}

type CreateJurisdictionResponse = JurisdictionApiResponse<
  | {
      jurisdiction: Jurisdiction
    }
  | {
      jurisdictions: Jurisdiction[]
    }
>

export const CreateJurisdictionHandler = async (req: CreateJurisdictionRequest, res: CreateJurisdictionResponse) => {
  const [error, jurisdictions] = await JurisdictionService.createJurisdictions(
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
