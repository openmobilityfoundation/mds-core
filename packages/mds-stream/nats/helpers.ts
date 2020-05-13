import nats from 'ts-nats'
import logger from '@mds-core/mds-logger'
import { getEnvVar } from '@mds-core/mds-utils'

const initializeNatsClient = () => {
  const { NATS } = getEnvVar({ NATS: 'localhost' })
  return nats.connect({
    url: `nats://${NATS}:4222`,
    reconnect: true,
    waitOnFirstConnect: true,
    maxReconnectAttempts: -1 // Retry forever
  })
}

export const createStreamConsumer = async (
  topic: string,
  processor: nats.MsgCallback,
  options: nats.SubscriptionOptions = {}
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

export const disconnectClient = (consumer: nats.Client) => consumer.close()
