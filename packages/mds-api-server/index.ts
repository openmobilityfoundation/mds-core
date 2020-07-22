import morgan from 'morgan'
import bodyParser from 'body-parser'
import express from 'express'
import CorsMiddleware from 'cors'
import logger from '@mds-core/mds-logger'
import { pathPrefix, AuthorizationError } from '@mds-core/mds-utils'
import {
  AuthorizationHeaderApiAuthorizer,
  ApiAuthorizer,
  AuthorizerClaims,
  ProviderIdClaim,
  UserEmailClaim,
  JurisdictionsClaim
} from '@mds-core/mds-api-authorizer'

export type ApiRequest<B = {}> = express.Request<{}, unknown, B, {}>

/**
 * Type of request route/path parameters (req.params)
 * R: Required route parameter(s)
 * O: Optional route parameter(s)
 */
export type ApiRequestParams<R extends string, O extends string = never> = {
  params: { [P in R]: string } & Partial<{ [P in O]: string }>
}

/**
 * Type of request query parameters (res.query)
 * S: (Single) Query parameter expected to appear at most once
 * M: (Multiple) Query parameter that can appear 0 or more times
 */
export type ApiRequestQuery<S extends string, M extends string[] = never> = {
  query: Partial<{ [P in Exclude<S, M[number]>]: string }> & Partial<{ [P in M[number]]: string | string[] }>
}

/**
 * B: Type of response body (res.send)
 */
export type ApiResponse<B = {}> = Omit<
  express.Response<
    B | { error: unknown; error_description?: string; error_details?: string[] } | { errors: unknown[] }
  >,
  'locals'
> & { locals: unknown }

/**
 * L: Type of response locals (res.locals)
 */
export type ApiResponseLocals<L> = {
  locals: L
}

export type ApiClaims<AccessTokenScope extends string> = {
  claims: AuthorizerClaims | null
  scopes: AccessTokenScope[]
}

export type ApiVersion<V extends string> = { version: V }

export type ApiVersionedResponse<V extends string, B = {}> = ApiResponse<B & ApiVersion<V>> &
  ApiResponseLocals<ApiVersion<V>>

const health = () => {
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

export const RequestLoggingMiddleware = <AccessTokenScope extends string>(): express.RequestHandler =>
  morgan<ApiRequest, ApiResponse & ApiResponseLocals<ApiClaims<AccessTokenScope>>>(
    (tokens, req, res) => {
      return [
        ...(res.locals.claims?.provider_id ? [res.locals.claims.provider_id] : []),
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, 'content-length'),
        '-',
        tokens['response-time'](req, res),
        'ms'
      ].join(' ')
    },
    {
      skip: (req, res) => {
        // By default only log 400/500 errors
        const { API_REQUEST_LOG_LEVEL = 0 } = process.env
        return res.statusCode < Number(API_REQUEST_LOG_LEVEL)
      },
      // Use logger, but remove extra line feed added by morgan stream option
      stream: { write: msg => logger.info(msg.slice(0, -1)) }
    }
  )

export const JsonBodyParserMiddleware = (options: bodyParser.OptionsJson) => bodyParser.json(options)

export const MaintenanceModeMiddleware = () => (req: ApiRequest, res: ApiResponse, next: express.NextFunction) =>
  process.env.MAINTENANCE ? res.status(503).send(health()) : next()

type AuthorizerMiddlewareOptions = { authorizer: ApiAuthorizer }
export const AuthorizerMiddleware = ({
  authorizer = AuthorizationHeaderApiAuthorizer
}: Partial<AuthorizerMiddlewareOptions> = {}) => <AccessTokenScope extends string>(
  req: ApiRequest,
  res: ApiResponse & ApiResponseLocals<ApiClaims<AccessTokenScope>>,
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

export const ApiVersionMiddleware = <V extends string>(mimeType: string, versions: readonly V[]) => ({
  withDefaultVersion: (preferred: V) => async (
    req: ApiRequest,
    res: ApiVersionedResponse<V>,
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
        latest: versions.reduce<V | undefined>((latest, version) => {
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

    if (req.method === 'OPTIONS') {
      /* If the incoming request is an OPTIONS request,
       * immediately respond with the negotiated version.
       * If the client did not negotiate a valid version, fall-through to a 406 response.
       */
      if (supported.length > 0) {
        const [{ latest }] = supported.sort((a, b) => b.q - a.q)
        if (latest) {
          res.locals.version = latest
          res.setHeader('Content-Type', `${mimeType};version=${MinorVersion(latest)}`)
          return res.status(200).send()
        }
      }
    } else if (supported.length > 0) {
      /* If the incoming request is a non-OPTIONS request,
       * set the negotiated version header, and forward the request to the next handler.
       * If the client did not negotiate a valid version, fall-through to provide the "preferred" version,
       * or, if they requested an invalid version, respond with a 406.
       */
      const [{ latest }] = supported.sort((a, b) => b.q - a.q)
      if (latest) {
        res.locals.version = latest
        res.setHeader('Content-Type', `${mimeType};version=${MinorVersion(latest)}`)
        return next()
      }
    } else if (values.length === 0) {
      /*
       * If no versions specified by the client for a non-OPTIONS request,
       * fall-back to latest internal version supported
       */
      res.locals.version = preferred
      res.setHeader('Content-Type', `${mimeType};version=${MinorVersion(preferred)}`)
      return next()
    }

    // 406 - Not Acceptable
    return res.sendStatus(406)
  }
})

export const HealthRequestHandler = async (req: ApiRequest, res: ApiResponse) => res.status(200).send(health())

const serverVersion = () => {
  const { npm_package_name, npm_package_version, npm_package_git_commit } = process.env
  return npm_package_name && npm_package_version
    ? `${npm_package_name} v${npm_package_version} (${npm_package_git_commit || 'local'})`
    : 'Server'
}

type HttpServerOptions = Partial<{
  port: string | number
}>

export const HttpServer = (api: express.Express, options: HttpServerOptions = {}) => {
  const { HTTP_KEEP_ALIVE_TIMEOUT = 15000, HTTP_HEADERS_TIMEOUT = 20000 } = process.env

  const port = Number(options.port || process.env.PORT || 4000)

  const server = api.listen(port, () => {
    logger.info(
      `${serverVersion()} running on port ${port}; Timeouts(${HTTP_KEEP_ALIVE_TIMEOUT}/${HTTP_HEADERS_TIMEOUT})`
    )
  })

  // Increase default timeout values to mitigate spurious 503 errors from Istio
  server.keepAliveTimeout = Number(HTTP_KEEP_ALIVE_TIMEOUT)
  server.headersTimeout = Number(HTTP_HEADERS_TIMEOUT)

  return server
}

type CorsMiddlewareOptions = Omit<CorsMiddleware.CorsOptions, 'preflightContinue'>

export const ApiServer = (
  api: (server: express.Express) => express.Express,
  { authorizer, ...corsOptions }: Partial<AuthorizerMiddlewareOptions & CorsMiddlewareOptions> = {},
  app: express.Express = express()
): express.Express => {
  logger.info(`${serverVersion()} starting`)

  // Log the custom authorization namespace/claims
  const claims = [ProviderIdClaim, UserEmailClaim, JurisdictionsClaim]
  claims.forEach(claim => {
    logger.info(`${serverVersion()} using authorization claim ${claim()}`)
  })
  // Disable x-powered-by header
  app.disable('x-powered-by')

  // Middleware
  app.use(
    RequestLoggingMiddleware(),
    CorsMiddleware({ preflightContinue: true, ...corsOptions }),
    JsonBodyParserMiddleware({ limit: '5mb' }),
    MaintenanceModeMiddleware(),
    AuthorizerMiddleware({ authorizer })
  )

  // Health Route
  app.get(pathPrefix('/health'), HealthRequestHandler)

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
    : async (
        req: ApiRequest,
        res: ApiResponse & ApiResponseLocals<ApiClaims<AccessTokenScope>>,
        next: express.NextFunction
      ) => {
        const { scopes, claims } = res.locals
        const valid = await validator(scopes, claims)
        return valid
          ? next()
          : res.status(403).send({ error: new AuthorizationError('no access without scope', { claims }) })
      }
