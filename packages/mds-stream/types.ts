export type ReadStreamOptions = Partial<{
  count: number
  block: number
  noack: boolean
}>

export const Streams = ['device:index', 'device:raw'] as const
export const [DEVICE_INDEX_STREAM, DEVICE_RAW_STREAM] = Streams
export type Stream = typeof Streams[number]

export type StreamItemID = string
export type StreamItemType = string
export type StreamItemData = string
export type StreamItem = [StreamItemID, [StreamItemType, StreamItemData]]
export type ReadStreamResult = [Stream, StreamItem[]]
