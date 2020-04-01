import { Producer } from 'kafkajs'
import { isArray } from 'util'
import { Nullable } from '@mds-core/mds-types'
import { StreamProducer } from '../stream-interface'
import { createStreamProducer, isProducerReady, disconnectProducer, StreamProducerOptions } from './helpers'

export const KafkaStreamProducer = (topic: string, options?: Partial<StreamProducerOptions>): StreamProducer => {
  let producer: Nullable<Producer> = null
  return {
    initialize: async () => {
      if (!producer) {
        producer = await createStreamProducer(options)
      }
    },
    write: async <T extends {}>(message: T[] | T) => {
      if (isProducerReady(producer)) {
        const messages = (isArray(message) ? message : [message]).map(msg => {
          return { value: JSON.stringify(msg) }
        })

        await producer.send({
          topic,
          messages
        })
      }
    },
    shutdown: async () => {
      await disconnectProducer(producer)
      producer = null
    }
  }
}
