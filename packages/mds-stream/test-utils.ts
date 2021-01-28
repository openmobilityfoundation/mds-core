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

import { StreamProducer } from './stream-interface'

type MockedStream<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key in keyof StreamProducer<T>]: jest.MockedFunction<any>
}

export const mockStream = <T>(stream: StreamProducer<T>, overrides?: Partial<MockedStream<T>>): MockedStream<T> => {
  const mockedMethods: MockedStream<T> = {
    initialize: jest.fn(async () => undefined),
    shutdown: jest.fn(async () => undefined),
    write: jest.fn(async () => undefined),
    ...overrides
  }

  Object.entries(mockedMethods).forEach(([key, fn]) => {
    jest.spyOn(stream, key as keyof StreamProducer<T>).mockImplementation(fn)
  })

  return mockedMethods
}
