import { ServerError } from '@mds-core/mds-utils'
import { Jurisdiction } from '@mds-core/mds-types'
import { JurisdictionApiResponse } from '../types'

export const UnexpectedServiceError = (error: ServerError | null) =>
  error instanceof ServerError ? error : new ServerError('Unexected Service Error', { error })

export const HasJurisdictionClaim = <TBody extends {}>(res: JurisdictionApiResponse<TBody>) => (
  jurisdiction: Jurisdiction
): boolean =>
  res.locals.scopes.includes('jurisdictions:read') ||
  (res.locals.claims?.jurisdictions?.split(' ') ?? []).includes(jurisdiction.agency_key)
