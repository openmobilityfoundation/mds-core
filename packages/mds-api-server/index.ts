import bodyParser from 'body-parser'
import express from 'express'
import { pathsFor } from '@mds-core/mds-utils'
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
    res.locals.claims = authorizer(req)
    if (maintenance) {
      if (req.method !== 'OPTIONS') {
        if (
          !pathsFor('/')
            .concat(pathsFor('/health'))
            .includes(req.path)
        ) {
          return res.status(503).send(about())
        }
      }
    }
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
