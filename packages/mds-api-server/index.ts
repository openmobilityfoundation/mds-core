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
const AccessTokenScopes = [
  'admin:all',
  'audits:delete',
  'audits:read',
  'audits:write',
  'compliance:read',
  'compliance:read:provider',
  'events:read',
  'events:write:provider',
  'geographies:delete',
  'geographies:read',
  'geographies:write',
  'policies:delete',
  'policies:publish',
  'policies:read',
  'policies:write',
  'providers:read',
  'status_changes:read',
  'telemetry:write:provider',
  'trips:read',
  'vehicles:read',
  'vehicles:read:provider',
  'vehicles:write:provider'
] as const
type AccessTokenScope = typeof AccessTokenScopes[number]

type ScopeValidator<TAccessTokenScope extends string = AccessTokenScope> = (
  check: (scope: TAccessTokenScope) => boolean
) => boolean

export const checkScopeClaim = <TAccessTokenScope extends string = AccessTokenScope>(
  validator: ScopeValidator<TAccessTokenScope>,
  claims: Pick<ApiAuthorizerClaims, 'scope'> | null = null
): boolean => {
  if (process.env.VERIFY_ACCESS_TOKEN_SCOPE !== 'false') {
    const granted = claims && claims.scope ? claims.scope.split(' ') : []
    return validator(scope => !scope || granted.includes(scope))
  }
  return true
}

export const checkScope = (validator: ScopeValidator) => (
  req: ApiRequest,
  res: ApiResponse,
  next: express.NextFunction
) => {
  if (checkScopeClaim(validator, res.locals.claims)) {
    return next()
  }
  return res
    .status(403)
    .send({ error: new AuthorizationError('no access without scope', { claims: res.locals.claims }) })
}
