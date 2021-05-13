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

import { ClientDisconnectedError } from '@mds-core/mds-utils'
import { StreamProducer } from './stream-interface'

/**
 * If the producer is disconnected, it re-initializes, tries to write again
 * @param producer an instance of StreamProducer
 * @throws ClientDisconnectedError
 */
export const safeWrite = async <T>(producer: StreamProducer<T>, message: T | T[]) => {
  try {
    await producer.write(message)
  } catch (err) {
    if (err instanceof ClientDisconnectedError) {
      await producer.initialize()
      await producer.write(message)
    }
  }
}
