import express from 'express'
import logger from '@mds-core/mds-logger'
import { pathsFor } from '@mds-core/mds-utils'
import { AboutRequestHandler, HealthRequestHandler, JsonBodyParserMiddleware } from '@mds-core/mds-api-server'
import { Cloudevent, BinaryHTTPReceiver } from 'cloudevents-sdk/v1'

export type EventHandler<TData, TResult> = (type: string, data: TData, event: Cloudevent) => Promise<TResult>

export const EventServer = <TData, TResult>(
  handler: EventHandler<TData, TResult>,
  server: express.Express = express()
): express.Express => {
  // Disable x-powered-by header
  server.disable('x-powered-by')

  const receiver = new BinaryHTTPReceiver()
  const { TENANT_ID = 'mds' } = process.env
  const TENANT_REGEXP = new RegExp(`^${TENANT_ID}\\.`)

  const parseCloudEvent = (req: express.Request): Cloudevent => {
    const event = receiver.parse(req.body, req.headers)
    return event.type(event.getType().replace(TENANT_REGEXP, ''))
  }

  // Middleware
  server.use(JsonBodyParserMiddleware({ limit: '1mb' }))

  // Routes
  server.get(pathsFor('/'), AboutRequestHandler)

  server.get(pathsFor('/health'), HealthRequestHandler)

  server.post('/', async (req, res) => {
    try {
      const event = parseCloudEvent(req)
      await logger.info('Cloud Event', req.method, event.format())
      const result = await handler(event.getType(), event.getData(), event)
      return res.status(200).send({ result })
    } catch (error) /* istanbul ignore next */ {
      await logger.error('ERROR Cloud Event', 'BODY:', req.body, 'HEADERS:', req.headers, 'ERROR:', error)
      return res.status(500).send({ error })
    }
  })

  return server
}
