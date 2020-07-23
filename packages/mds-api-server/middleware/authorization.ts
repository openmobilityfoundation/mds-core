import express from 'express'
import { ApiAuthorizer, AuthorizationHeaderApiAuthorizer } from '@mds-core/mds-api-authorizer'
import { ApiRequest, ApiResponse, ApiResponseLocals, ApiClaims } from '../@types'

export type AuthorizationMiddlewareOptions = Partial<{ authorizer: ApiAuthorizer }>

export const AuthorizationMiddleware = ({
  authorizer = AuthorizationHeaderApiAuthorizer
}: AuthorizationMiddlewareOptions = {}) => <AccessTokenScope extends string>(
  req: ApiRequest,
  res: ApiResponse & ApiResponseLocals<ApiClaims<AccessTokenScope>>,
  next: express.NextFunction
) => {
  const claims = authorizer(req)
  res.locals.claims = claims
  res.locals.scopes = claims && claims.scope ? (claims.scope.split(' ') as AccessTokenScope[]) : []
  next()
}
