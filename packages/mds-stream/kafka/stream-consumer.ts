import { EachMessagePayload, Consumer } from 'kafkajs'
import { Nullable } from '@mds-core/mds-types'
import { StreamConsumer } from '../stream-interface'
import { disconnectConsumer, createStreamConsumer, StreamConsumerOptions } from './helpers'

export const KafkaStreamConsumer = (
  topic: string,
  eachMessage: (payload: EachMessagePayload) => Promise<void>,
  options?: Partial<StreamConsumerOptions>
): StreamConsumer => {
  let consumer: Nullable<Consumer> = null
  return {
    initialize: async () => {
      if (!consumer) {
        consumer = await createStreamConsumer(topic, eachMessage, options)
      }
    },
    shutdown: async () => {
      await disconnectConsumer(consumer)
      consumer = null
    }
  }
}
