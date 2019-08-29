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
const MDS_ACCESS_SCOPES = ['admin:all', 'test:all'] as const
type MDS_ACCESS_SCOPE = typeof MDS_ACCESS_SCOPES[number]

export const hasAccessScope = (scopes: MDS_ACCESS_SCOPE[], claims: ApiAuthorizerClaims | null) => {
  if (scopes.length > 0 && claims && claims.scope) {
    const granted = claims.scope.split(' ')
    return scopes.some(scope => granted.includes(scope))
  }
  return scopes.length === 0
}

// This will generete an Express middleware function to verify that the token claims
// contain one or more of the specified scopes, for example:
// verifyAccessScope('test:all', 'admin:all') allows access with either test:all OR admin:all
// Express middleware can be chained to require more than one scope, for example:
// verifyAccessScope('test:all'), verifyAccessScope('admin:all') requires both test:all AND admin:all
export const verifyAccessScope = (...scopes: MDS_ACCESS_SCOPE[]) => (
  req: ApiRequest,
  res: ApiResponse,
  next: express.NextFunction
) => {
  if (hasAccessScope(scopes, res.locals.claims)) {
    return next()
  }
  return res.status(403).send({ error: new AuthorizationError('no access without scope', { scopes }) })
}
