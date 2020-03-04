import { JurisdictionService } from '@mds-core/mds-jurisdiction-service'
import { Jurisdiction, UUID } from '@mds-core/mds-types'
import { NotFoundError } from '@mds-core/mds-utils'
import { JurisdictionApiRequest, JurisdictionApiResponse } from '../types'
import { UnexpectedServiceError } from './utils'

type DeleteJurisdictionRequest = JurisdictionApiRequest<{ jurisdiction_id: UUID }>

type DeleteJurisdictionResponse = JurisdictionApiResponse<Pick<Jurisdiction, 'jurisdiction_id'>>

export const DeleteJurisdictionHandler = async (req: DeleteJurisdictionRequest, res: DeleteJurisdictionResponse) => {
  const [error, result] = await JurisdictionService.deleteJurisdiction(req.params.jurisdiction_id)

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
