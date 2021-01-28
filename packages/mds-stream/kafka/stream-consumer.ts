/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Kafka, EachMessagePayload, Consumer } from 'kafkajs'
import { Nullable, SingleOrArray } from '@mds-core/mds-types'
import logger from '@mds-core/mds-logger'
import { isDefined, asArray } from '@mds-core/mds-utils'
import { StreamConsumer } from '../stream-interface'
import { getKafkaBrokers } from './helpers'

export interface KafkaStreamConsumerOptions {
  clientId: string
  groupId: string
}

const createStreamConsumer = async (
  topics: SingleOrArray<string>,
  eachMessage: (payload: EachMessagePayload) => Promise<void>,
  { clientId = 'client', groupId = 'group' }: Partial<KafkaStreamConsumerOptions> = {}
) => {
  try {
    const brokers = getKafkaBrokers()

    if (!brokers) {
      return null
    }

    const kafka = new Kafka({ clientId, brokers })
    const consumer = kafka.consumer({ groupId })
    await consumer.connect()
    await Promise.all(asArray(topics).map(topic => consumer.subscribe({ topic })))
    await consumer.run({ eachMessage })
    return consumer
  } catch (err) {
    logger.error(err)
  }
  return null
}

const disconnectConsumer = async (consumer: Nullable<Consumer>) => {
  if (isDefined(consumer)) {
    await consumer.disconnect()
  }
}

export const KafkaStreamConsumer = (
  topics: SingleOrArray<string>,
  eachMessage: (payload: EachMessagePayload) => Promise<void>,
  options?: Partial<KafkaStreamConsumerOptions>
): StreamConsumer => {
  let consumer: Nullable<Consumer> = null
  return {
    initialize: async () => {
      if (!consumer) {
        consumer = await createStreamConsumer(topics, eachMessage, options)
      }
    },
    shutdown: async () => {
      await disconnectConsumer(consumer)
      consumer = null
    }
  }
}
