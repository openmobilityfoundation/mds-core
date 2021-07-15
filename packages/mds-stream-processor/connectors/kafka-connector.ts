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

import logger from '@mds-core/mds-logger'
import stream, { KafkaStreamConsumerOptions, KafkaStreamProducerOptions } from '@mds-core/mds-stream'
import { SingleOrArray } from '@mds-core/mds-types'
import { StreamSink, StreamSource } from '../@types'

export const KafkaSource =
  <TMessage>(
    topics: SingleOrArray<string>,
    {
      messageLogger,
      ...options
    }: Partial<KafkaStreamConsumerOptions & { messageLogger: (message: TMessage) => string | undefined }>
  ): StreamSource<TMessage> =>
  processor => {
    logger.info('Creating KafkaSource', { topics, options })
    return stream.KafkaStreamConsumer(
      topics,
      async payload => {
        const {
          topic,
          message: { offset, value }
        } = payload
        if (value) {
          const message: TMessage = JSON.parse(value.toString())
          logger.info(`Processing ${topic}/${offset}: ${(messageLogger && messageLogger(message)) ?? value.toString()}`)
          return processor(message)
        }
      },
      options
    )
  }

export const KafkaSink =
  <TMessage>(topic: string, options?: Partial<KafkaStreamProducerOptions>): StreamSink<TMessage> =>
  () => {
    logger.info('Creating KafkaSink', { topic, options })
    return stream.KafkaStreamProducer(topic, options)
  }
