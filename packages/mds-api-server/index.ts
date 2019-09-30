import bodyParser from 'body-parser'
import express from 'express'
import cors from 'cors'
import { pathsFor, AuthorizationError } from '@mds-core/mds-utils'
import { AuthorizationHeaderApiAuthorizer, ApiAuthorizer, ApiAuthorizerClaims } from '@mds-core/mds-api-authorizer'
import { validateScopes } from '@mds-core/mds-api-scopes'
import { ScopeValidator, AccessTokenScope } from '@mds-core/mds-types'

export type ApiRequest = express.Request

export interface ApiResponseLocals {
  claims: ApiAuthorizerClaims | null
  scopes: AccessTokenScope[]
}

export interface ApiResponse<T = unknown> extends express.Response {
  locals: ApiResponseLocals
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

interface ApiServerOptions {
  authorizer: ApiAuthorizer
  handleCors: boolean
}

export const ApiServer = (
  api: (server: express.Express) => express.Express,
  options: Partial<ApiServerOptions> = {},
  app: express.Express = express()
): express.Express => {
  const { authorizer, handleCors } = {
    authorizer: AuthorizationHeaderApiAuthorizer,
    handleCors: false,
    ...options
  }

  // Disable x-powered-by header
  app.disable('x-powered-by')

  // Parse JSON body
  app.use(bodyParser.json({ limit: '5mb' }))

  // Enable CORS
  app.use(
    handleCors
      ? cors() // Server handles CORS
      : (req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
          // Gateway handles CORS pre-flight
          if (req.method !== 'OPTIONS') {
            res.header('Access-Control-Allow-Origin', '*')
          }
          next()
        }
  )

  // Authorizer
  app.use((req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
    const { MAINTENANCE: maintenance } = process.env
    if (maintenance) {
      return res.status(503).send(about())
    }
    const claims = authorizer(req)
    res.locals.claims = claims
    res.locals.scopes = claims && claims.scope ? (claims.scope.split(' ') as AccessTokenScope[]) : []
    next()
  })

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

/* istanbul ignore next */
export const checkScope = (validator: ScopeValidator) => (
  req: ApiRequest,
  res: ApiResponse,
  next: express.NextFunction
) => {
  if (process.env.VERIFY_ACCESS_TOKEN_SCOPE === 'false' || validateScopes(validator, res.locals.scopes)) {
    next()
  } else {
    res.status(403).send({ error: new AuthorizationError('no access without scope', { claims: res.locals.claims }) })
  }
}
