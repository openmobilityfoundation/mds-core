import { v4 as uuid } from 'uuid'
import stan from 'node-nats-streaming'
import logger from '@mds-core/mds-logger'
import { getEnvVar } from '@mds-core/mds-utils'

export type EventProcessor<TData, TResult> = (type: string, data: TData) => Promise<TResult>

const SUBSCRIPTION_TYPES = ['event', 'telemetry'] as const
type SUBSCRIPTION_TYPE = typeof SUBSCRIPTION_TYPES[number]

const subscriptionCb = async <TData, TResult>(processor: EventProcessor<TData, TResult>, msg: stan.Message) => {
  const { TENANT_ID } = getEnvVar({
    TENANT_ID: 'mds'
  })
  const TENANT_REGEXP = new RegExp(`^${TENANT_ID}\\.`)

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
    logger.error(err)
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
  const subscriber = nats.subscribe(`${TENANT_ID}.${type}`, {
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
  return stan.connect(STAN_CLUSTER, `mds-event-consumer-${uuid()}`, {
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
      logger.info('Connected!')

      /* Subscribe to all available types. Down the road, this should probably be a parameter passed in to the parent function. */
      return Promise.all(
        SUBSCRIPTION_TYPES.map(type => {
          return natsSubscriber({ nats, processor, TENANT_ID, type })
        })
      )
    })

    nats.on('reconnect', () => {
      logger.info('Connected!')

      /* Subscribe to all available types. Down the road, this should probably be a parameter passed in to the parent function. */
      return Promise.all(
        SUBSCRIPTION_TYPES.map(type => {
          return natsSubscriber({ nats, processor, TENANT_ID, type })
        })
      )
    })

    /* istanbul ignore next */
    nats.on('error', async err => {
      logger.error(err)
    })
  } catch (err) {
    logger.error(err)
  }
}
