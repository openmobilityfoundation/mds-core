import { Msg, StringCodec, SubOpts } from 'nats'
import logger from '@mds-core/mds-logger'

/**
 * We must encode/decode messages between strings & UInt8Arrays
 */
export const { decode: decodeAsUInt8Array, encode: encodeAsUInt8Array } = StringCodec()

export type DecodedNatsMsg = Omit<Msg, 'data'> & { data: string }

export type NatsProcessorFn = (message: DecodedNatsMsg) => void

/**
 *
 * @param processor Processor to run on each message
 * @returns Wrapped version of the processor which decodes NATS messages prior to processing
 */
export const natsCbWrapper: (processor: NatsProcessorFn) => SubOpts<Msg>['callback'] = processor => (err, msg) => {
  if (err) {
    logger.error('NATS Error', { err })
    return
  }
  const { data, ...msgMeta } = msg

  const decodedMsg = { ...msgMeta, data: decodeAsUInt8Array(data) }
  processor(decodedMsg)
}
