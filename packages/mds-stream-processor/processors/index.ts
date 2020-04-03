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

import { StreamSource, StreamSink } from '../connectors'

export type StreamTransform<TMessageIn, TMessageOut> = (message: TMessageIn) => Promise<TMessageOut | null>

export interface StreamProcessorController {
  start: () => Promise<void>
  stop: () => Promise<void>
}

// StreamProcessor - Read from source, apply transform to each message, and write to sink
export const StreamProcessor = <TMessageIn, TMessageOut>(
  source: StreamSource<TMessageIn>,
  transform: StreamTransform<TMessageIn, TMessageOut>,
  sink: StreamSink<TMessageOut>
): StreamProcessorController => {
  const producer = sink()
  const consumer = source(async message => {
    const transformed = await transform(message)
    if (transformed) {
      await producer.write(transformed)
    }
  })
  return {
    start: async () => {
      await producer.initialize()
      await consumer.initialize()
    },
    stop: async () => {
      await Promise.all([consumer.shutdown(), producer.shutdown()])
    }
  }
}

// StreamTap - Read from source and write to sink (no transform)
export const StreamTap = <TMessage>(source: StreamSource<TMessage>, sink: StreamSink<TMessage>) =>
  StreamProcessor(source, async message => message, sink)
