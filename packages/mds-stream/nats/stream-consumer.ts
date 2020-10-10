import { SubscriptionOptions, Client, MsgCallback } from 'ts-nats'
import { Nullable, SingleOrArray } from '@mds-core/mds-types'
import { createStreamConsumer, disconnectClient } from './helpers'
import { StreamConsumer } from '../stream-interface'

export const NatsStreamConsumer = (
  topics: SingleOrArray<string>,
  eachMessage: MsgCallback,
  options?: Partial<SubscriptionOptions>
): StreamConsumer => {
  let consumer: Nullable<Client> = null
  return {
    initialize: async () => {
      if (!consumer) {
        consumer = await createStreamConsumer(topics, eachMessage, options)
      }
    },
    shutdown: async () => {
      if (consumer) await disconnectClient(consumer)
      consumer = null
    }
  }
}
