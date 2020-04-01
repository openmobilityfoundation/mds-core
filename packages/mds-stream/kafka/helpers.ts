import { Kafka, Producer, EachMessagePayload, Consumer } from 'kafkajs'
import logger from '@mds-core/mds-logger'
import { Nullable } from '@mds-core/mds-types'

const {
  env: { KAFKA_HOST = 'localhost:9092' }
} = process

export interface StreamProducerOptions {
  clientId: string
}

export const createStreamProducer = async ({ clientId = 'writer' }: Partial<StreamProducerOptions> = {}) => {
  try {
    const kafka = new Kafka({ clientId, brokers: [KAFKA_HOST] })
    const producer = kafka.producer()
    await producer.connect()
    return producer
  } catch (err) {
    logger.error(err)
  }
  return null
}

export interface StreamConsumerOptions {
  clientId: string
  groupId: string
}

export const createStreamConsumer = async (
  topic: string,
  eachMessage: (payload: EachMessagePayload) => Promise<void>,
  { clientId = 'client', groupId = 'group' }: Partial<StreamConsumerOptions> = {}
) => {
  try {
    const kafka = new Kafka({ clientId, brokers: [KAFKA_HOST] })
    const consumer = kafka.consumer({ groupId })
    await consumer.connect()
    await consumer.subscribe({ topic })
    await consumer.run({ eachMessage })
    return consumer
  } catch (err) {
    logger.error(err)
  }
  return null
}

export const isProducerReady = (stream: Nullable<Producer>): stream is Producer => stream !== null

export const isConsumerReady = (stream: Nullable<Consumer>): stream is Consumer => stream !== null

export const disconnectProducer = async (producer: Nullable<Producer>) => {
  if (isProducerReady(producer)) {
    await producer.disconnect()
  }
}

export const disconnectConsumer = async (consumer: Nullable<Consumer>) => {
  if (isConsumerReady(consumer)) {
    await consumer.disconnect()
  }
}
