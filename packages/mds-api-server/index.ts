import morgan from 'morgan'
import bodyParser from 'body-parser'
import express from 'express'
import cors from 'cors'
import logger from '@mds-core/mds-logger'
import { pathsFor, AuthorizationError } from '@mds-core/mds-utils'
import { AuthorizationHeaderApiAuthorizer, ApiAuthorizer, AuthorizerClaims } from '@mds-core/mds-api-authorizer'
import { Params, ParamsDictionary } from 'express-serve-static-core'

export type ApiRequest<P extends Params = ParamsDictionary> = express.Request<P>

export type ApiQuery<Q extends string> = { query: Partial<{ [P in Q]: string }> }

export interface ApiResponse<L = unknown, B = unknown> extends express.Response<B | { error: unknown }> {
  locals: L
}

export type ApiClaims<AccessTokenScope extends string> = {
  claims: AuthorizerClaims | null
  scopes: AccessTokenScope[]
}

export type ApiVersion<TVersion extends string> = { version: TVersion }

export type ApiVersionedResponse<TVersion extends string, L = unknown, TBody = unknown> = ApiResponse<
  L & ApiVersion<TVersion>,
  TBody & ApiVersion<TVersion>
>

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

export const RequestLoggingMiddleware = <AccessTokenScope extends string>(): express.RequestHandler =>
  morgan(
    (tokens, req: ApiRequest, res: ApiResponse<ApiClaims<AccessTokenScope>>) =>
      [
        ...(res.locals.claims?.provider_id ? [res.locals.claims.provider_id] : []),
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
        const { API_REQUEST_LOG_LEVEL = 0 } = process.env
        return res.statusCode < Number(API_REQUEST_LOG_LEVEL)
      },
      // Use logger, but remove extra line feed added by morgan stream option
      stream: { write: msg => logger.info(msg.slice(0, -1)) }
    }
  )

export const JsonBodyParserMiddleware = (options: bodyParser.OptionsJson) => bodyParser.json(options)

type CorsMiddlewareOptions = { handleCors: boolean }
export const CorsMiddleware = ({ handleCors = false }: Partial<CorsMiddlewareOptions> = {}) =>
  handleCors
    ? cors() // Server handles CORS
    : (req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*')
        next()
      }

export const MaintenanceModeMiddleware = () => (req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
  if (process.env.MAINTENANCE) {
    return res.status(503).send(about())
  }
  next()
}

type AuthorizerMiddlewareOptions = { authorizer: ApiAuthorizer }
export const AuthorizerMiddleware = ({
  authorizer = AuthorizationHeaderApiAuthorizer
}: Partial<AuthorizerMiddlewareOptions> = {}) => <AccessTokenScope extends string>(
  req: ApiRequest,
  res: ApiResponse<ApiClaims<AccessTokenScope>>,
  next: express.NextFunction
) => {
  const claims = authorizer(req)
  res.locals.claims = claims
  res.locals.scopes = claims && claims.scope ? (claims.scope.split(' ') as AccessTokenScope[]) : []
  next()
}

const MinorVersion = (version: string) => {
  const [major, minor] = version.split('.')
  return `${major}.${minor}`
}

export const ApiVersionMiddleware = <TVersion extends string>(mimeType: string, versions: readonly TVersion[]) => ({
  withDefaultVersion: (preferred: TVersion) => async (
    req: ApiRequest,
    res: ApiVersionedResponse<TVersion>,
    next: express.NextFunction
  ) => {
    // Parse the Accept header into a list of values separated by commas
    const { accept: header } = req.headers
    const values = header ? header.split(',').map(value => value.trim()) : []

    // Parse the version and q properties from all values matching the specified mime type
    const accepted = values.reduce<{ version: string; q: number }[] | null>((accept, value) => {
      const [mime, ...properties] = value.split(';').map(property => property.trim())
      return mime === mimeType
        ? (accept ?? []).concat({
            ...properties.reduce<{ version: string; q: number }>(
              (info, property) => {
                const [key, val] = property.split('=').map(keyvalue => keyvalue.trim())
                return {
                  ...info,
                  version: key === 'version' ? val : info.version,
                  q: key === 'q' ? Number(val) : info.q
                }
              },
              { version: preferred, q: 1.0 }
            )
          })
        : accept
    }, null) ?? [
      {
        version: preferred,
        q: 1.0
      }
    ]

    // Determine if any of the requested versions are supported
    const supported = accepted
      .map(info => ({
        ...info,
        latest: versions.reduce<TVersion | undefined>((latest, version) => {
          if (MinorVersion(info.version) === MinorVersion(version)) {
            if (latest) {
              return latest > version ? latest : version
            }
            return version
          }
          return latest
        }, undefined)
      }))
      .filter(info => info.latest !== undefined)

    // Get supported version with highest q value
    if (supported.length > 0) {
      const [{ latest }] = supported.sort((a, b) => b.q - a.q)
      if (latest) {
        res.locals.version = latest
        res.setHeader('Content-Type', `${mimeType};version=${MinorVersion(latest)}`)
        return next()
      }
    }

    // 406 - Not Acceptable
    return res.sendStatus(406)
  }
})

export const AboutRequestHandler = async (req: ApiRequest, res: ApiResponse) => {
  return res.status(200).send(about())
}

export const HealthRequestHandler = async (req: ApiRequest, res: ApiResponse) => {
  return res.status(200).send({
    ...about(),
    process: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
}

export const HttpServer = (port: string | number, api: express.Express) => {
  const {
    npm_package_name,
    npm_package_version,
    npm_package_git_commit,
    HTTP_KEEP_ALIVE_TIMEOUT = 15000,
    HTTP_HEADERS_TIMEOUT = 20000
  } = process.env

  const server = api.listen(Number(port), () => {
    logger.info(
      `${npm_package_name} v${npm_package_version} (${
        npm_package_git_commit ?? 'local'
      }) running on port ${port}; Timeouts(${HTTP_KEEP_ALIVE_TIMEOUT}/${HTTP_HEADERS_TIMEOUT})`
    )
  })

  // Increase default timeout values to mitigate spurious 503 errors from Istio
  server.keepAliveTimeout = Number(HTTP_KEEP_ALIVE_TIMEOUT)
  server.headersTimeout = Number(HTTP_HEADERS_TIMEOUT)

  return server
}

export const ApiServer = (
  api: (server: express.Express) => express.Express,
  { handleCors, authorizer }: Partial<CorsMiddlewareOptions & AuthorizerMiddlewareOptions> = {},
  app: express.Express = express()
): express.Express => {
  // Disable x-powered-by header
  app.disable('x-powered-by')

  // Middleware
  app.use(
    RequestLoggingMiddleware(),
    JsonBodyParserMiddleware({ limit: '5mb' }),
    CorsMiddleware({ handleCors }),
    MaintenanceModeMiddleware(),
    AuthorizerMiddleware({ authorizer })
  )

  // Routes
  app.get(pathsFor('/'), AboutRequestHandler)
  app.get(pathsFor('/health'), HealthRequestHandler)

  return api(app)
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
    ? async (req: ApiRequest, res: ApiResponse<ApiClaims<AccessTokenScope>>, next: express.NextFunction) => {
        next() // Bypass
      }
    : async (req: ApiRequest, res: ApiResponse<ApiClaims<AccessTokenScope>>, next: express.NextFunction) => {
        const { scopes, claims } = res.locals
        const valid = await validator(scopes, claims)
        return valid
          ? next()
          : res.status(403).send({ error: new AuthorizationError('no access without scope', { claims }) })
      }
