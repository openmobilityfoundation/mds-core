import { Client } from 'ts-nats'
import { isArray } from 'util'
import { Nullable } from '@mds-core/mds-types'
import { StreamProducer } from '../stream-interface'
import { createStreamProducer, disconnectClient } from './helpers'

export const NatsStreamProducer = <TMessage>(topic: string): StreamProducer<TMessage> => {
  let producer: Nullable<Client> = null
  return {
    initialize: async () => {
      if (!producer) {
        producer = await createStreamProducer()
      }
    },
    write: async (message: TMessage[] | TMessage) => {
      const messages = (isArray(message) ? message : [message]).map(msg => {
        return JSON.stringify(msg)
      })

      await Promise.all(messages.map(msg => producer?.publish(topic, msg)))
    },
    shutdown: async () => {
      if (producer) await disconnectClient(producer)
      producer = null
    }
  }
}
