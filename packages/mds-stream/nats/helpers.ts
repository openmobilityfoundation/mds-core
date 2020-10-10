import { connect, MsgCallback, SubscriptionOptions, Client } from 'ts-nats'
import logger from '@mds-core/mds-logger'
import { getEnvVar, asArray } from '@mds-core/mds-utils'
import { SingleOrArray } from '@mds-core/mds-types'

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
  topics: SingleOrArray<string>,
  processor: MsgCallback,
  options: SubscriptionOptions = {}
) => {
  const natsClient = await initializeNatsClient()
  try {
    await Promise.all(asArray(topics).map(topic => natsClient.subscribe(topic, processor, options)))
  } catch (err) {
    logger.error(err)
  }
  return natsClient
}

export const createStreamProducer = async () => {
  return initializeNatsClient()
}

export const disconnectClient = (consumer: Client) => consumer.close()
