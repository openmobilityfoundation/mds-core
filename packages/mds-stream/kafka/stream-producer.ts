/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { Kafka, Producer } from 'kafkajs'
import { isArray } from 'util'
import { Nullable } from '@mds-core/mds-types'
import logger from '@mds-core/mds-logger'
import { isDefined, ClientDisconnectedError, ExceptionMessages } from '@mds-core/mds-utils'
import { StreamProducer } from '../stream-interface'
import { getKafkaBrokers } from './helpers'

export interface KafkaStreamProducerOptions {
  clientId: string
}

const createStreamProducer = async ({ clientId = 'writer' }: Partial<KafkaStreamProducerOptions> = {}) => {
  try {
    const kafka = new Kafka({ clientId, brokers: getKafkaBrokers() })
    const producer = kafka.producer()
    await producer.connect()
    return producer
  } catch (err) {
    logger.error(err)
  }
  return null
}

const disconnectProducer = async (producer: Nullable<Producer>) => {
  if (isDefined(producer)) {
    await producer.disconnect()
  }
}

export const KafkaStreamProducer = <TMessage>(
  topic: string,
  options?: Partial<KafkaStreamProducerOptions>
): StreamProducer<TMessage> => {
  let producer: Nullable<Producer> = null
  return {
    initialize: async () => {
      if (!producer) {
        producer = await createStreamProducer(options)
      }
    },
    write: async (message: TMessage[] | TMessage) => {
      if (isDefined(producer)) {
        const messages = (isArray(message) ? message : [message]).map(msg => {
          return { value: JSON.stringify(msg) }
        })

        await producer.send({
          topic,
          messages
        })
        return
      }
      throw new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
    },
    shutdown: async () => {
      await disconnectProducer(producer)
      producer = null
    }
  }
}
