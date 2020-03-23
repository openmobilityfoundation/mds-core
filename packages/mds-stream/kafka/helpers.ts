import Kafka, { ProducerStream, ConsumerStream } from 'node-rdkafka'
import log from '@mds-core/mds-logger'
import {
  ProducerOptions,
  ProducerStreamOptions,
  Producer,
  Consumer,
  ConsumerOptions,
  ConsumerStreamOptions
} from './types'

const {
  env: { KAFKA_HOST = 'localhost:9092' }
} = process

export const defaultKafkaErrorHandler = async (err: object) => {
  await log.error(`Kafka Error ${JSON.stringify(err)}`)
}

export const createWriteStreamWrapper = (
  producerOptions: Partial<ProducerOptions>,
  streamOptions: Partial<ProducerStreamOptions>,
  errorHandler?: (err: any) => Promise<void>
) => {
  const stream = ((Kafka.Producer as unknown) as Producer).createWriteStream(
    { ...producerOptions, 'metadata.broker.list': KAFKA_HOST, 'queue.buffering.max.messages': 100000 },
    {},
    { ...streamOptions }
  )

  stream.on('error', errorHandler ?? defaultKafkaErrorHandler)
  return stream
}

export const createReadStreamWrapper = (
  consumerOptions: Partial<ConsumerOptions>,
  streamOptions: ConsumerStreamOptions,
  readCb: (message: Kafka.ConsumerStreamMessage) => void,
  errorHandler?: (err: any) => Promise<void>
) => {
  const stream = ((Kafka.KafkaConsumer as unknown) as Consumer).createReadStream(
    { ...consumerOptions, 'metadata.broker.list': KAFKA_HOST, 'group.id': 'default' },
    {},
    { ...streamOptions }
  )

  stream.on('error', errorHandler ?? defaultKafkaErrorHandler)
  stream.on('data', readCb)
  return stream
}

export const isWriteStreamReady = (stream: ProducerStream | undefined): stream is ProducerStream => {
  return stream !== undefined
}

export const isReadStreamReady = (stream: ConsumerStream | undefined): stream is ConsumerStream => {
  return stream !== undefined
}

export const killWriteStream = (stream: ProducerStream | undefined) => {
  if (isWriteStreamReady(stream)) {
    stream.destroy()
  }
}

export const killReadStream = (stream: ConsumerStream | undefined) => {
  if (isReadStreamReady(stream)) {
    stream.destroy()
  }
}
