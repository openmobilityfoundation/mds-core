import Sinon from 'sinon'
import { StreamProducer } from './stream-interface'

type SinonMockedStream<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key in keyof StreamProducer<T>]: Sinon.SinonSpy<any[], any>
}

export const mockStream = <T>(
  stream: StreamProducer<T>,
  overrides?: Partial<SinonMockedStream<T>>
): SinonMockedStream<T> => {
  const mockedMethods: SinonMockedStream<T> = {
    initialize: Sinon.fake.resolves(undefined),
    shutdown: Sinon.fake.resolves(undefined),
    write: Sinon.fake.resolves(undefined),
    ...overrides
  }

  Object.entries(mockedMethods).forEach(([key, val]) => {
    Sinon.replace(stream, key as keyof StreamProducer<T>, val)
  })

  return mockedMethods
}
