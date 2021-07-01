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

import { Nullable } from '@mds-core/mds-types'
import { NatsConnection, StringCodec } from 'nats'
import { StreamProducer } from '../stream-interface'
import { createStreamProducer, disconnectClient } from './helpers'

/**
 * We must encode all of our messages as UInt8 Arrays
 */
const { encode: encodeAsUInt8Array } = StringCodec()

export const NatsStreamProducer = <TMessage>(topic: string): StreamProducer<TMessage> => {
  let producer: Nullable<NatsConnection> = null
  return {
    initialize: async () => {
      if (!producer) {
        producer = await createStreamProducer()
      }
    },
    write: async (message: TMessage[] | TMessage) => {
      const messages = (Array.isArray(message) ? message : [message]).map(msg => {
        return encodeAsUInt8Array(JSON.stringify(msg))
      })

      await Promise.all(messages.map(msg => producer?.publish(topic, msg)))
    },
    shutdown: async () => {
      if (producer) await disconnectClient(producer)
      producer = null
    }
  }
}
