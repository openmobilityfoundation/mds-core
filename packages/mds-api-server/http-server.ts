import express from 'express'
import logger from '@mds-core/mds-logger'
import { serverVersion } from './utils'

export type HttpServerOptions = Partial<{
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
