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

import { StreamConsumer, StreamProducer } from '@mds-core/mds-stream'

export type StreamSource<TMessage> = (processor: (message: TMessage) => Promise<void>) => StreamConsumer
export type StreamSink<TMessage> = () => StreamProducer<TMessage>

export type StreamTransform<TMessageIn, TMessageOut> = (
  message: TMessageIn
) => Promise<TMessageOut | Array<TMessageOut> | null>

export interface StreamProcessorController {
  start: () => Promise<void>
  stop: () => Promise<void>
}
