import bodyParser from 'body-parser'
import express from 'express'
import { pathsFor, AuthorizationError } from '@mds-core/mds-utils'
import { AuthorizationHeaderApiAuthorizer, ApiAuthorizer, ApiAuthorizerClaims } from '@mds-core/mds-api-authorizer'

export type ApiRequest = express.Request

export interface ApiResponse<T = unknown> extends express.Response {
  locals: {
    claims: ApiAuthorizerClaims | null
  }
  status: (code: number) => ApiResponse<T | { error: Error }>
  send: (body: T) => ApiResponse<T | { error: Error }>
}

const about = () => {
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
    status: maintenance ? `${maintenance} (MAINTENANCE)` : 'Running'
  }
}

export const ApiServer = (
  api: (server: express.Express) => express.Express,
  authorizer: ApiAuthorizer = AuthorizationHeaderApiAuthorizer,
  app: express.Express = express()
): express.Express => {
  // Authorizer
  app.use((req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
    const { MAINTENANCE: maintenance } = process.env
    if (maintenance) {
      return res.status(503).send(about())
    }
    res.locals.claims = authorizer(req)
    next()
  })

  // Disable x-powered-by header
  app.disable('x-powered-by')

  // Parse JSON bodiy
  app.use(bodyParser.json({ limit: '5mb' }))

  app.get(pathsFor('/'), async (req: ApiRequest, res: ApiResponse) => {
    // 200 OK
    return res.status(200).send(about())
  })

  app.get(pathsFor('/health'), async (req: ApiRequest, res: ApiResponse) => {
    // 200 OK
    return res.status(200).send({
      ...about(),
      process: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    })
  })

  return api(app)
}

// Canonical list of MDS scopes
const AccessTokenScopes = ['admin:all'] as const
type AccessTokenScope = typeof AccessTokenScopes[number]
type AccessTokenScopeClause<TAccessTokenScope extends string> = TAccessTokenScope[]

export const verifyAccessTokenScopeClaim = <TAccessTokenScope extends string = AccessTokenScope>(
  claims: ApiAuthorizerClaims | null,
  ...clauses: AccessTokenScopeClause<TAccessTokenScope>[]
) => {
  if (process.env.VERIFY_ACCESS_TOKEN_SCOPE === 'false') {
    return true
  }
  if (claims && claims.scope) {
    const granted = claims.scope.split(' ')
    return clauses.every(scopes => scopes.some(scope => granted.includes(scope)))
  }
  return clauses.reduce((count, clause) => count + clause.length, 0) === 0
}

// This function will generete Express middleware  to verify that the token claims
// satisfy the specified scope expression.
//
// Examples:
//
// verifyAccessTokenScope(['scope:1'])
// - allows access to tokens containing scope:1
//
// verifyAccessTokenScope(['scope:1', 'scope:2'])
// - allows access to tokens containing (scope:1 OR scope:2)
//
// verifyAccessTokenScope(['scope:1'], ['scope:2'])
// - allows access to tokens containing (scope:1 AND scope:2)
//
// verifyAccessTokenScope(['scope:1', 'scope:2'], ['scope:3', 'scope:4'])
// - allows access to tokens containing (scope:1 OR scope:2) AND (scope:3 OR scope:4)
//
export const verifyAccessTokenScope = (...clauses: AccessTokenScope[][]) => (
  req: ApiRequest,
  res: ApiResponse,
  next: express.NextFunction
) => {
  if (verifyAccessTokenScopeClaim(res.locals.claims, ...clauses)) {
    return next()
  }
  return res.status(403).send({ error: new AuthorizationError('no access without scope', { scopes: clauses }) })
}
