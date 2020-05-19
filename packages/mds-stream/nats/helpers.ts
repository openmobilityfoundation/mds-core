import { connect, MsgCallback, SubscriptionOptions, Client } from 'ts-nats'
import logger from '@mds-core/mds-logger'
import { getEnvVar } from '@mds-core/mds-utils'

const initializeNatsClient = () => {
  const { NATS } = getEnvVar({ NATS: 'localhost' })
  return connect({
    url: `nats://${NATS}:4222`,
    reconnect: true,
    waitOnFirstConnect: true,
    maxReconnectAttempts: -1 // Retry forever
  })
}

export const createStreamConsumer = async (
  topic: string,
  processor: MsgCallback,
  options: SubscriptionOptions = {}
) => {
  const natsClient = await initializeNatsClient()

  try {
    await natsClient.subscribe(topic, processor, options)
  } catch (err) {
    logger.error(err)
  }

  return natsClient
}

export const createStreamProducer = async () => {
  return initializeNatsClient()
}

export const disconnectClient = (consumer: Client) => consumer.close()
