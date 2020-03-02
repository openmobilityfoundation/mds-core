import express from 'express'
import { ApiRequest, ApiResponse } from '@mds-core/mds-api-server/dist'
import { AuthorizationError } from '@mds-core/mds-utils'

export const NativeApiClaimsMiddleware = async (req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
  if (!(req.path.includes('/health') || req.path === '/')) {
    if (!res.locals.claims) {
      return res.status(401).send({ error: new AuthorizationError('missing_claims') })
    }
  }
  return next()
}
