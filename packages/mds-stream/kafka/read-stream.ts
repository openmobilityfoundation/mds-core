import Kafka, { ConsumerStream } from 'node-rdkafka'
import { StreamReader } from '../stream-interface'
import { killReadStream, createReadStreamWrapper } from './helpers'

export const KafkaStreamReader: (name: string, readCb: (data: Kafka.ConsumerStreamMessage) => void) => StreamReader = (
  name,
  readCb
) => {
  let stream: ConsumerStream | undefined
  return {
    initialize: async () => {
      if (!stream) stream = await createReadStreamWrapper({}, { topics: [name] }, readCb)
    },
    shutdown: async () => {
      killReadStream(stream)
    }
  }
}
