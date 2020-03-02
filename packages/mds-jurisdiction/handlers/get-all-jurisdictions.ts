import { JurisdictionService } from '@mds-core/mds-jurisdiction-service'
import { Jurisdiction } from '@mds-core/mds-types'
import { HasJurisdictionClaim, UnexpectedServiceError } from './utils'
import { JurisdictionApiRequest, JurisdictionApiResponse } from '../types'

interface GetAllJurisdictionsRequest extends JurisdictionApiRequest {
  // Query string parameters always come in as strings
  query: Partial<
    {
      [P in 'effective']: string
    }
  >
}

type GetAllJurisdictionsResponse = JurisdictionApiResponse<{
  jurisdictions: Jurisdiction[]
}>

export const GetAllJurisdictionsHandler = async (req: GetAllJurisdictionsRequest, res: GetAllJurisdictionsResponse) => {
  const { effective } = req.query

  const [error, jurisdictions] = await JurisdictionService.getAllJurisdictions({
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
