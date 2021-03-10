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

import { mockStream } from '../test-utils'
import { StreamProducer } from '../stream-interface'
import { KafkaStreamProducer } from '../kafka'

type FakeStreamPayload = 'foo'

describe('Mock stream API', () => {
  it('Mocks successfully', async () => {
    const fakeStream: StreamProducer<FakeStreamPayload> = KafkaStreamProducer<FakeStreamPayload>('fake-stream')
    const { initialize, write, shutdown } = mockStream(fakeStream)

    await fakeStream.initialize()
    expect(initialize).toHaveBeenCalledTimes(1)

    await fakeStream.write('foo')
    expect(write).toHaveBeenCalledWith('foo')
    expect(write).toHaveBeenCalledTimes(1)

    await fakeStream.shutdown()
    expect(shutdown).toHaveBeenCalledTimes(1)
  })

  it('Mocks with overrides successfully', async () => {
    const fakeStream: StreamProducer<FakeStreamPayload> = KafkaStreamProducer<FakeStreamPayload>('fake-stream')
    const overrideMocks = {
      initialize: jest.fn(async () => undefined),
      shutdown: jest.fn(async () => undefined),
      write: jest.fn(async x => {
        return undefined
      })
    }
    mockStream(fakeStream, overrideMocks)

    const { initialize, write, shutdown } = overrideMocks

    await fakeStream.initialize()
    expect(initialize).toHaveBeenCalledTimes(1)

    await fakeStream.write('foo')
    expect(write).toHaveBeenCalledWith('foo')
    expect(write).toHaveBeenCalledTimes(1)

    await fakeStream.shutdown()
    expect(shutdown).toHaveBeenCalledTimes(1)
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })
})
