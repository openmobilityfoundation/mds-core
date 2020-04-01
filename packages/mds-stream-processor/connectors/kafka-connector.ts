/*
    Copyright 2019-2020 City of Los Angeles.

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

import logger from '@mds-core/mds-logger'
import stream from '@mds-core/mds-stream'
import { StreamConsumerOptions, StreamProducerOptions } from '@mds-core/mds-stream/kafka/helpers'
import { StreamSink, StreamSource } from './index'

export const KafkaStreamSource = <TMessage>(
  topic: string,
  options?: Partial<StreamConsumerOptions>
): StreamSource<TMessage> => processor => {
  logger.info('Creating KafkaStreamSource', topic, options)
  return stream.KafkaStreamConsumer(
    topic,
    payload => {
      const {
        partition,
        message: { offset, value }
      } = payload
      if (Number(offset) % 1_000 === 0) {
        logger.info(`KafkaStreamSource Topic: ${topic} Partition: ${partition} Offset: ${offset}`)
      }
      return processor(JSON.parse(value.toString()))
    },
    options
  )
}

export const KafkaStreamSink = <TMessage>(
  topic: string,
  options?: Partial<StreamProducerOptions>
): StreamSink<TMessage> => () => {
  logger.info('Creating KafkaStreamSink', topic, options)
  return stream.KafkaStreamProducer(topic, options)
}
