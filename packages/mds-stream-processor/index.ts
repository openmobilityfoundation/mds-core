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
import { SingleOrArray } from '@mds-core/mds-types'
import { asArray } from '@mds-core/mds-utils'
import { StreamProcessorController, StreamSink, StreamSource, StreamTransform } from './@types'

// StreamProcessor - Read from source, apply transform to each message, and write to sink
export const StreamProcessor = <TMessageIn, TMessageOut>(
  source: StreamSource<TMessageIn>,
  transform: StreamTransform<TMessageIn, TMessageOut>,
  sinks: SingleOrArray<StreamSink<TMessageOut>>
): StreamProcessorController => {
  const producers = asArray(sinks).map(sink => sink())
  const consumer = source(async message => {
    const transformed = await transform(message)
    if (transformed) {
      if (asArray(transformed).length > 0) {
        try {
          await Promise.all(producers.map(producer => producer.write(transformed)))
        } catch (error) {
          logger.error(`Error when writing to producer`, error)
          await Promise.all(producers.map(producer => producer.shutdown()))
          await Promise.all(producers.map(producer => producer.initialize()))
          throw error
        }
      }
    }
  })
  return {
    start: async () => {
      await Promise.all(producers.map(producer => producer.initialize()))
      await consumer.initialize()
    },
    stop: async () => {
      await consumer.shutdown()
      await Promise.all(producers.map(producer => producer.shutdown()))
    }
  }
}

// StreamTap - Read from source and write to sink (no transform)
export const StreamForwarder = <TMessage>(source: StreamSource<TMessage>, sinks: SingleOrArray<StreamSink<TMessage>>) =>
  StreamProcessor(source, message => Promise.resolve(message), sinks)

const launch = async (processor: StreamProcessorController) => {
  const {
    env: { npm_package_name, npm_package_version, npm_package_git_commit, KAFKA_HOST }
  } = process

  try {
    await processor.start()
    logger.info(
      `Running ${npm_package_name} v${npm_package_version} (${
        npm_package_git_commit ?? 'local'
      }) connected to Kafka on ${KAFKA_HOST}`
    )
  } catch (error) {
    logger.error(
      `${npm_package_name} v${npm_package_version} (${
        npm_package_git_commit ?? 'local'
      }) connected to Kafka on ${KAFKA_HOST} failed to start`,
      error
    )
    return 1
  }
  return 0
}

export const ProcessorController = {
  start: (processor: StreamProcessorController) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    launch(processor)
  }
}

export * from './@types'
export * from './connectors'
