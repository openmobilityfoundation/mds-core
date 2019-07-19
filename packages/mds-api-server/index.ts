import bodyParser from 'body-parser'
import express from 'express'
import { pathsFor } from 'mds-utils'
import { AuthorizationHeaderApiAuthorizer, ApiAuthorizer, ApiAuthorizerClaims } from 'mds-api-authorizer'

export type ApiRequest = express.Request

export interface ApiResponse<T = unknown> extends express.Response {
  locals: {
    claims: ApiAuthorizerClaims | null
  }
  status: (code: number) => ApiResponse<T | { error: Error }>
  send: (body: T) => ApiResponse<T | { error: Error }>
}

export const server = (
  api: (server: express.Express) => express.Express,
  authorizer: ApiAuthorizer = AuthorizationHeaderApiAuthorizer,
  app: express.Express = express()
): express.Express => {
  // Authorizer
  app.use((req: ApiRequest, res: ApiResponse, next) => {
    res.locals.claims = authorizer(req)
    next()
  })

  // Disable x-powered-by header
  app.disable('x-powered-by')

  // Parse JSON bodiy
  app.use(
    bodyParser.json({
      limit: '5mb'
    })
  )

  app.get(pathsFor('/'), async (req: ApiRequest, res: ApiResponse) => {
    const {
      versions: { node },
      env: {
        npm_package_name: name,
        npm_package_version: version,
        npm_package_git_branch: branch,
        npm_package_git_commit: commit
      }
    } = process
    // 200 OK
    res.status(200).send({ name, version, build: { branch, commit }, node })
  })

  app.get(pathsFor('/health'), async (req: ApiRequest, res: ApiResponse) => {
    // 200 OK
    res.status(200).send({
      node: process.versions.node,
      process: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    })
  })

  return api(app)
}
