import { ProducerStream, ConsumerStream } from 'node-rdkafka'

/*
  FIXME:
  Necessary interface due to already-fixed typedef problem in the node-rdkafka repo,
  will be removed upon next upstream release
*/
export interface Producer {
  createWriteStream(conf: any, topicConf: any, streamOptions: any): ProducerStream
}

export interface Consumer {
  createReadStream(conf: any, topicConfig: any, streamOptions: any): ConsumerStream
}

export interface ProducerOptions {
  'metadata.broker.list': string
  'queue.buffering.max.messages': number
}

export interface ConsumerOptions {
  'metadata.broker.list': string
  'group.id': string
}

export interface ProducerStreamOptions {
  topic: string
}

export interface ConsumerStreamOptions {
  topics: string[]
}
