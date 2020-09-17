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
    jest.spyOn(stream, key as keyof StreamProducer<T>).mockImplementationOnce(fn)
  })

  return mockedMethods
}
