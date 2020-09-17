import logger from '@mds-core/mds-logger'
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
        logger.info(x)
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
