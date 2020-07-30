import httpContext from 'express-http-context'
import express from 'express'
import log from '@mds-core/mds-logger'
import { ApiRequest, ApiResponse } from '../@types'

/**
 * Middleware that extracts the X-Request-Id header set by the gateway,
 * and includes it in contextual logs for a given request.
 */
const RequestIdMiddleware = (req: ApiRequest, res: ApiResponse, next: express.NextFunction) => {
  const xRequestId = req.get('x-request-id')
  if (xRequestId) {
    httpContext.set('x-request-id', xRequestId)
  } else {
    log.warn('X-Request-Id is not set! If you expect it, please check your ingress gateway configuration.')
  }
  return next()
}

export const HttpContextMiddleware = () => {
  return [httpContext.middleware, RequestIdMiddleware]
}
