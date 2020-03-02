import { Jurisdiction, UUID } from '@mds-core/mds-types'
import { JurisdictionService } from '@mds-core/mds-jurisdiction-service'
import { AuthorizationError, NotFoundError } from '@mds-core/mds-utils'
import { JurisdictionApiResponse, JurisdictionApiRequest } from '../types'
import { HasJurisdictionClaim, UnexpectedServiceError } from './utils'

interface GetOneJurisdictionRequest extends JurisdictionApiRequest<{ jurisdiction_id: UUID }> {
  // Query string parameters always come in as strings
  query: Partial<
    {
      [P in 'effective']: string
    }
  >
}

type GetOneJurisdictionResponse = JurisdictionApiResponse<{
  jurisdiction: Jurisdiction
}>

export const GetOneJurisdictionHandler = async (req: GetOneJurisdictionRequest, res: GetOneJurisdictionResponse) => {
  const { effective } = req.query
  const { jurisdiction_id } = req.params

  const [error, jurisdiction] = await JurisdictionService.getOneJurisdiction(jurisdiction_id, {
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
  if (error instanceof NotFoundError) {
    return res.status(404).send({ error })
  }

  return res.status(500).send({ error: UnexpectedServiceError(error) })
}
