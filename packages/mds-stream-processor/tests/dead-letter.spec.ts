import { StreamSink } from '../@types'
import { GeneratorSource } from '../connectors'
import { StreamProcessor } from '../index'

type MockedSink<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key in keyof StreamSink<T>]: jest.MockedFunction<any>
}

const MockSinkFactory = <T = any>(overrides?: Partial<MockedSink<T>>) => {
  const mockedMethods = {
    initialize: jest.fn(async () => undefined),
    shutdown: jest.fn(async () => undefined),
    write: jest.fn(async () => undefined),
    ...overrides
  }

  return {
    mockedMethods,
    sink: () => mockedMethods
  }
}

describe('Tests dead-letter handling', () => {
  afterEach(() => jest.clearAllMocks())

  it('When there are no throws, the dead-letter topic should receive no messages', async () => {
    // Dummy source that generates 2 test messages
    const source = GeneratorSource(async function* () {
      let i = 0
      while (i < 2) {
        i++

        yield 'test'
      }
    })

    // Dummy transform
    const transformer = async (message: string) => `${message}-${Date.now()}`

    const {
      mockedMethods: { write: standardSinkWrite },
      sink: standardSink
    } = MockSinkFactory()
    const {
      mockedMethods: { write: deadLetterSinkWrite },
      sink: deadLetterSink
    } = MockSinkFactory()

    const streamProcessor = StreamProcessor(source, transformer, [standardSink], [deadLetterSink])

    await streamProcessor.start()

    expect(standardSinkWrite).toBeCalledTimes(2)
    expect(deadLetterSinkWrite).toBeCalledTimes(0)
  })

  it('All throws should be captured by the dead letter sink', async () => {
    // Dummy source that generates 2 test messages
    const source = GeneratorSource(async function* () {
      let i = 0
      while (i < 2) {
        i++

        yield 'test'
      }
    })

    // Always throw a generic Error from the transformer
    const transformer = async (message: string) => {
      throw new Error(message)
    }

    const {
      mockedMethods: { write: standardSinkWrite },
      sink: standardSink
    } = MockSinkFactory()
    const {
      mockedMethods: { write: deadLetterSinkWrite },
      sink: deadLetterSink
    } = MockSinkFactory()

    const streamProcessor = StreamProcessor(source, transformer, [standardSink], [deadLetterSink])

    await streamProcessor.start()

    expect(standardSinkWrite).toBeCalledTimes(0)
    expect(deadLetterSinkWrite).toBeCalledTimes(2)
  })

  it('If writing to all of the dead letter sinks fails, process should exit', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      return undefined as never
    })

    // Dummy source that generates 2 test messages
    const source = GeneratorSource(async function* () {
      let i = 0
      while (i < 1) {
        i++

        yield 'test'
      }
    })

    // Always throw a generic Error from the transformer
    const transformer = async (message: string) => {
      throw new Error(message)
    }

    const {
      mockedMethods: { write: standardSinkWrite },
      sink: standardSink
    } = MockSinkFactory()

    const {
      mockedMethods: { write: deadLetterSinkWrite },
      sink: deadLetterSink
    } = MockSinkFactory({
      write: jest.fn(() => {
        throw new Error('dead letter sink write error')
      })
    })

    const streamProcessor = StreamProcessor(source, transformer, [standardSink], [deadLetterSink])

    await streamProcessor.start()

    expect(standardSinkWrite).toBeCalledTimes(0)
    expect(deadLetterSinkWrite).toBeCalledTimes(1)
    expect(mockExit).toBeCalledTimes(1)
  })

  it('If writing to any dead letter sinks succeeds, no errors are thrown', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      return undefined as never
    })

    // Dummy source that generates 2 test messages
    const source = GeneratorSource(async function* () {
      let i = 0
      while (i < 1) {
        i++

        yield 'test'
      }
    })

    // Always throw a generic Error from the transformer
    const transformer = async (message: string) => {
      throw new Error(message)
    }

    const {
      mockedMethods: { write: standardSinkWrite },
      sink: standardSink
    } = MockSinkFactory()

    const {
      mockedMethods: { write: throwingDeadLetterSinkWrite },
      sink: throwingDeadLetterSink
    } = MockSinkFactory({
      write: jest.fn(async () => {
        throw new Error('dead letter sink write error')
      })
    })

    const {
      mockedMethods: { write: healthyDeadLetterSinkWrite },
      sink: healthyDeadLetterSink
    } = MockSinkFactory()

    const streamProcessor = StreamProcessor(
      source,
      transformer,
      [standardSink],
      [healthyDeadLetterSink, throwingDeadLetterSink]
    )

    await streamProcessor.start()

    expect(standardSinkWrite).toBeCalledTimes(0)
    expect(throwingDeadLetterSinkWrite).toBeCalledTimes(1)
    expect(healthyDeadLetterSinkWrite).toBeCalledTimes(1)
    expect(mockExit).toBeCalledTimes(0)
  })
})
