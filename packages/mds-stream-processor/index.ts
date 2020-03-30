import logger from '@mds-core/mds-logger'
import stream from '@mds-core/mds-stream'
import { StreamConsumerOptions, StreamProducerOptions } from '@mds-core/mds-stream/kafka/helpers'

export type StreamSource<TMessage> = (processor: (message: TMessage) => Promise<void>) => Promise<void>
export type StreamTransform<TMessageIn, TMessageOut> = (message: TMessageIn) => Promise<TMessageOut | null>
export type StreamSink<TMessage> = () => Promise<(message: TMessage) => Promise<void>>

export const StreamProcessor = <TMessageIn, TMessageOut>(
  source: StreamSource<TMessageIn>,
  transform: StreamTransform<TMessageIn, TMessageOut>,
  sink: StreamSink<TMessageOut>
) => ({
  run: async () => {
    const producer = await sink()
    await source(async message => {
      const transformed = await transform(message)
      if (transformed) {
        await producer(transformed)
      }
    })
  }
})

export const KafkaStreamSource = <TMessage>(
  topic: string,
  options?: Partial<StreamConsumerOptions>
): StreamSource<TMessage> => async processor => {
  logger.info('Starting KafkaStreamSource', topic, options)
  const consumer = stream.KafkaStreamConsumer(
    topic,
    payload => {
      const {
        partition,
        message: { offset, value }
      } = payload
      if (Number(offset) % 1_000 === 0) {
        logger.info(`Processing ${topic} Partition: ${partition} Offset: ${offset}`)
      }
      return processor(JSON.parse(value.toString()))
    },
    options
  )
  await consumer.initialize()
}

export const KafkaStreamSink = <TMessage>(
  topic: string,
  options?: Partial<StreamProducerOptions>
): StreamSink<TMessage> => async () => {
  logger.info('Starting KafkaStreamSink', topic, options)
  const producer = stream.KafkaStreamProducer(topic, options)
  await producer.initialize()
  return message => producer.write(message)
}
