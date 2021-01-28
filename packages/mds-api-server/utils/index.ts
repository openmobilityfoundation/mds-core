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

import express from 'express'
import { AuthorizerClaims } from '@mds-core/mds-api-authorizer'
import { AuthorizationError } from '@mds-core/mds-utils'
import { ApiRequest, ApiResponse, ApiResponseLocalsClaims } from '../@types'

export const healthInfo = () => {
  const {
    versions: { node },
    env: {
      npm_package_name: name,
      npm_package_version: version,
      npm_package_git_branch: branch,
      npm_package_git_commit: commit,
      npm_package_build_date: date,
      MAINTENANCE: maintenance
    }
  } = process
  return {
    name,
    version,
    build: { date, branch, commit },
    node,
    status: maintenance ? `${maintenance} (MAINTENANCE)` : 'Running',
    process: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  }
}

export const serverVersion = () => {
  const { npm_package_name, npm_package_version, npm_package_git_commit } = process.env
  return npm_package_name && npm_package_version
    ? `${npm_package_name} v${npm_package_version} (${npm_package_git_commit || 'local'})`
    : 'Server'
}

export type AccessTokenScopeValidator<AccessTokenScope extends string = never> = (
  scopes: AccessTokenScope[],
  claims: AuthorizerClaims | null
) => boolean | Promise<boolean>

/* istanbul ignore next */
export const checkAccess = <AccessTokenScope extends string = never>(
  validator: AccessTokenScopeValidator<AccessTokenScope>
) =>
  process.env.VERIFY_ACCESS_TOKEN_SCOPE === 'false'
    ? async (req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
        next() // Bypass
      }
    : async (
        req: ApiRequest,
        res: ApiResponse & ApiResponseLocalsClaims<AccessTokenScope>,
        next: express.NextFunction
      ) => {
        const { scopes = [], claims } = res.locals
        const valid = await validator(scopes, claims)
        return valid
          ? next()
          : res.status(403).send({ error: new AuthorizationError('no access without scope', { claims }) })
      }
