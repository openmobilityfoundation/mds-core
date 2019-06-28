import bodyParser from 'body-parser'
import express from 'express'
import { pathsFor } from 'mds-utils'
import { AuthorizationHeaderApiAuthorizer, ApiAuthorizer, ApiAuthorizerClaims } from 'mds-api-authorizer'

export type ApiRequest = express.Request

export interface ApiResponse extends express.Response {
  locals: {
    claims: ApiAuthorizerClaims
  }
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
      versions: { node: runtime },
      env: { npm_package_name: name, npm_package_version: version }
    } = process
    // 200 OK
    res.status(200).send({ name, version, runtime })
  })

  return api(app)
}
