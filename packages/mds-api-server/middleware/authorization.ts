/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ApiAuthorizer, AuthorizationHeaderApiAuthorizer } from '@mds-core/mds-api-authorizer'
import express from 'express'
import { ApiRequest, ApiResponse, ApiResponseLocalsClaims } from '../@types'

export type AuthorizationMiddlewareOptions = Partial<{ authorizer: ApiAuthorizer }>

export const AuthorizationMiddleware =
  ({ authorizer = AuthorizationHeaderApiAuthorizer }: AuthorizationMiddlewareOptions = {}) =>
  <AccessTokenScope extends string>(
    req: ApiRequest,
    res: ApiResponse & ApiResponseLocalsClaims<AccessTokenScope>,
    next: express.NextFunction
  ) => {
    const claims = authorizer(req)
    res.locals.claims = claims
    res.locals.scopes = claims && claims.scope ? (claims.scope.split(' ') as AccessTokenScope[]) : []
    next()
  }
