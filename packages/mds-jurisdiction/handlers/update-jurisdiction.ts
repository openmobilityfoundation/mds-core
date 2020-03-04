import { UpdateJurisdictionType, JurisdictionService } from '@mds-core/mds-jurisdiction-service'
import { Jurisdiction, UUID } from '@mds-core/mds-types'
import { ValidationError, NotFoundError } from '@mds-core/mds-utils'
import { JurisdictionApiRequest, JurisdictionApiResponse } from '../types'
import { UnexpectedServiceError } from './utils'

interface UpdateJurisdictionRequest extends JurisdictionApiRequest<{ jurisdiction_id: UUID }> {
  body: UpdateJurisdictionType
}

type UpdateJurisdictionResponse = JurisdictionApiResponse<{
  jurisdiction: Jurisdiction
}>

export const UpdateJurisdictionHandler = async (req: UpdateJurisdictionRequest, res: UpdateJurisdictionResponse) => {
  const [error, jurisdiction] = await JurisdictionService.updateJurisdiction(req.params.jurisdiction_id, req.body)

  // Handle result
  if (jurisdiction) {
    return res.status(200).send({ version: res.locals.version, jurisdiction })
  }

  // Handle errors
  if (error instanceof ValidationError) {
    return res.status(400).send({ error })
  }
  if (error instanceof NotFoundError) {
    return res.status(404).send({ error })
  }

  return res.status(500).send({ error: UnexpectedServiceError(error) })
}
