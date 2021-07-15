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
import { MapStream, mapSync, split } from 'event-stream'
import { createReadStream, createWriteStream, WriteStream } from 'fs'
import { StreamSink, StreamSource } from '../@types'

export const FileSource =
  <TMessage>(path: string): StreamSource<TMessage> =>
  processor => {
    let stream: Nullable<MapStream> = null
    return {
      initialize: async () => {
        stream = createReadStream(path)
          .pipe(split())
          .pipe(
            mapSync(async (data: Buffer) => {
              if (stream) {
                stream.pause()

                if (data) await processor(JSON.parse(data.toString()))

                stream.resume()
              }
            })
          )
      },
      shutdown: async () => {
        return stream?.destroy()
      }
    }
  }

export const FileSink =
  <TMessage>(path: string): StreamSink<TMessage> =>
  () => {
    let stream: Nullable<WriteStream> = null
    return {
      initialize: async () => {
        stream = createWriteStream(path)
      },
      write: async (message: TMessage[] | TMessage) => {
        if (stream) stream.write(`${JSON.stringify(message)}\n`)
      },
      shutdown: async () => {
        return stream?.close()
      }
    }
  }
