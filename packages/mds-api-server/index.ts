import morgan from 'morgan'
import bodyParser from 'body-parser'
import express from 'express'
import cors from 'cors'
import logger from '@mds-core/mds-logger'
import { pathsFor, AuthorizationError } from '@mds-core/mds-utils'
import { AuthorizationHeaderApiAuthorizer, ApiAuthorizer, ApiAuthorizerClaims } from '@mds-core/mds-api-authorizer'
import { AccessTokenScope } from '@mds-core/mds-types'
import { Params, ParamsDictionary } from 'express-serve-static-core'

export type ApiRequest<P extends Params = ParamsDictionary> = express.Request<P>

export interface ApiResponseLocals {
  claims: ApiAuthorizerClaims | null
  scopes: AccessTokenScope[]
}

export interface ApiResponse<T = unknown> extends express.Response {
  locals: ApiResponseLocals
  send: (body: T | { error: Error }) => this
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

  // Middleware
  app.use(
    //
    // Request logging
    //
    morgan(
      (tokens, req: ApiRequest, res: ApiResponse) =>
        [
          ...(res.locals.claims && res.locals.claims.provider_id ? [res.locals.claims.provider_id] : []),
          tokens.method(req, res),
          tokens.url(req, res),
          tokens.status(req, res),
          tokens.res(req, res, 'content-length'),
          '-',
          tokens['response-time'](req, res),
          'ms'
        ].join(' '),
      {
        skip: (req: ApiRequest, res: ApiResponse) => {
          // By default only log 400/500 errors
          const { API_REQUEST_LOG_LEVEL = 400 } = process.env
          return res.statusCode < Number(API_REQUEST_LOG_LEVEL)
        },
        // Use logger, but remove extra line feed added by morgan stream option
        stream: { write: msg => logger.info(msg.slice(0, -1)) }
      }
    ),
    //
    // JSON body parser
    //
    bodyParser.json({ limit: '5mb' }),
    //
    // CORS
    //
    handleCors
      ? cors() // Server handles CORS
      : (req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
          res.header('Access-Control-Allow-Origin', '*')
          next()
        },
    //
    // Maintenance
    //
    (req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
      if (process.env.MAINTENANCE) {
        return res.status(503).send(about())
      }
      next()
    },
    //
    // Authorizer
    //
    (req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
      const claims = authorizer(req)
      res.locals.claims = claims
      res.locals.scopes = claims && claims.scope ? (claims.scope.split(' ') as AccessTokenScope[]) : []
      next()
    }
  )

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
export const checkAccess = (validator: (scopes: AccessTokenScope[]) => boolean) => (
  req: ApiRequest,
  res: ApiResponse,
  next: express.NextFunction
) => {
  if (process.env.VERIFY_ACCESS_TOKEN_SCOPE === 'false' || validator(res.locals.scopes)) {
    next()
  } else {
    res.status(403).send({ error: new AuthorizationError('no access without scope', { claims: res.locals.claims }) })
  }
}
