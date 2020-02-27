import express from 'express'
import { v4 as uuid } from 'uuid'
import stan from 'node-nats-streaming'
import { pathsFor } from '@mds-core/mds-utils'
import log from '@mds-core/mds-logger'
import { AboutRequestHandler, HealthRequestHandler, JsonBodyParserMiddleware } from '@mds-core/mds-api-server'
import Cloudevent, { BinaryHTTPReceiver } from 'cloudevents-sdk/v1'

export type EventProcessor<TData, TResult> = (type: string, data: TData) => Promise<TResult>
export type CEEventProcessor<TData, TResult> = (type: string, data: TData, event: Cloudevent) => Promise<TResult>

const SUBSCRIPTION_TYPES = ['event', 'telemetry'] as const
type SUBSCRIPTION_TYPE = typeof SUBSCRIPTION_TYPES[number]

const subscriptionCb = async <TData, TResult>(processor: EventProcessor<TData, TResult>, msg: stan.Message) => {
  const { TENANT_ID } = process.env

  const TENANT_REGEXP = new RegExp(`^${TENANT_ID || 'mds'}\\.`)

  try {
    const {
      spec: {
        payload: { data, type }
      }
    } = JSON.parse(msg.getRawData().toString())

    const parsedData = JSON.parse(data)

    await processor(type.replace(TENANT_REGEXP, ''), parsedData)
    msg.ack()
  } catch (err) {
    msg.ack()
    await log.error(err)
  }
}

const natsSubscriber = async <TData, TResult>({
  nats,
  processor,
  TENANT_ID,
  type
}: {
  nats: stan.Stan
  processor: EventProcessor<TData, TResult>
  TENANT_ID: string
  type: SUBSCRIPTION_TYPE
}) => {
  const subscriber = nats.subscribe(`${TENANT_ID || 'mds'}.${type}`, {
    ...nats.subscriptionOptions(),
    manualAcks: true,
    maxInFlight: 1
  })

  subscriber.on('message', async (msg: stan.Message) => {
    return subscriptionCb(processor, msg)
  })
}

const initializeNatsClient = ({
  NATS,
  STAN_CLUSTER,
  STAN_CREDS
}: {
  NATS: string
  STAN_CLUSTER: string
  STAN_CREDS?: string
}) => {
  return stan.connect(STAN_CLUSTER, `mds-event-processor-${uuid()}`, {
    url: `nats://${NATS}:4222`,
    userCreds: STAN_CREDS,
    reconnect: true
  })
}

export const initializeStanSubscriber = async <TData, TResult>({
  NATS,
  STAN_CLUSTER,
  STAN_CREDS,
  TENANT_ID,
  processor
}: {
  NATS: string
  STAN_CLUSTER: string
  STAN_CREDS?: string
  TENANT_ID: string
  processor: EventProcessor<TData, TResult>
}) => {
  const nats = initializeNatsClient({ NATS, STAN_CLUSTER, STAN_CREDS })

  try {
    nats.on('connect', () => {
      log.info('Connected!')

      /* Subscribe to all available types. Down the road, this should probably be a parameter passed in to the parent function. */
      return Promise.all(
        SUBSCRIPTION_TYPES.map(type => {
          return natsSubscriber({ nats, processor, TENANT_ID, type })
        })
      )
    })

    nats.on('reconnect', () => {
      log.info('Connected!')

      /* Subscribe to all available types. Down the road, this should probably be a parameter passed in to the parent function. */
      return Promise.all(
        SUBSCRIPTION_TYPES.map(type => {
          return natsSubscriber({ nats, processor, TENANT_ID, type })
        })
      )
    })
  } catch (err) {
    await log.error(err)
  }
}

export const EventServer = <TData, TResult>(
  processor?: CEEventProcessor<TData, TResult>,
  server: express.Express = express()
): express.Express => {
  const receiver = new BinaryHTTPReceiver()
  const { TENANT_ID = 'mds' } = process.env
  const TENANT_REGEXP = new RegExp(`^${TENANT_ID}\\.`)

  const parseCloudEvent = (req: express.Request): Cloudevent => {
    try {
      const event = receiver.parse(req.body, req.headers)
      return event.type(event.getType().replace(TENANT_REGEXP, ''))
    } catch {
      throw new Error('Malformed CE')
    }
  }

  // Disable x-powered-by header
  server.disable('x-powered-by')

  // Middleware
  server.use(JsonBodyParserMiddleware({ limit: '1mb' }))

  // Routes
  server.get(pathsFor('/'), AboutRequestHandler)

  server.get(pathsFor('/health'), HealthRequestHandler)

  server.post('/', async (req, res) => {
    const { method, headers, body } = req
    try {
      const event = parseCloudEvent(req)
      await log.info('Cloud Event', method, event.format())
      const result = processor
        ? await processor(event.getType(), event.getData(), event)
        : 'ERROR: No Processor Supplied'
      return res.status(200).send({ result })
    } catch (error) /* istanbul ignore next */ {
      await log.error('Cloud Event', error, { method, headers, body })
      if (String(error).includes('Malformed CE')) {
        return res.status(500).send({ error })
      }
      return res.status(202).send({ error })
    }
  })

  return server
}
