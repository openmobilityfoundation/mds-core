/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import logger from '@mds-core/mds-logger'
import redis from 'redis'
import bluebird from 'bluebird'
import Cloudevent from 'cloudevents-sdk'
import { Device, VehicleEvent, Telemetry } from '@mds-core/mds-types'
import {
  Stream,
  StreamItem,
  ReadStreamResult,
  DEVICE_INDEX_STREAM,
  DEVICE_RAW_STREAM,
  PROVIDER_EVENT_STREAM,
  ReadStreamOptions,
  StreamItemID
} from './types'

const { env } = process

/* eslint-reason no cloud-event typings */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
let binding: any = null

function getBinding() {
  if (!binding) {
    const config = {
      method: 'POST',
      url: env.SINK
    }

    // eslint-disable-next-line new-cap
    binding = new Cloudevent.bindings['http-binary0.2'](config)
  }

  return binding
}

async function writeCloudEvent(type: string, data: string) {
  const cloudevent = new Cloudevent(Cloudevent.specs['0.2'])
    .type(type)
    .source(env.CE_NAME)
    .data(data)

  return getBinding().emit(cloudevent)
}

declare module 'redis' {
  interface RedisClient {
    dbsizeAsync: () => Promise<number>
    flushdbAsync: () => Promise<'OK'>
    pingAsync: <TPong extends string = 'PONG'>(response?: TPong) => Promise<TPong>
    xaddAsync: (...args: unknown[]) => Promise<string>
    xinfoAsync: <T extends 'STREAM' | 'GROUPS'>(
      arg: T,
      stream: Stream
    ) => Promise<
      T extends 'STREAM'
        ? [
            'length',
            number,
            'radix-tree-keys',
            number,
            'radix-tree-nodes',
            number,
            'groups',
            number,
            'last-generated-id',
            string,
            'first-entry',
            StreamItem | null,
            'last-entry',
            StreamItem | null
          ]
        : ['name', string, 'consumers', number, 'pending', number, 'last-delivered-id', string][]
    >
    xreadAsync: (...args: unknown[]) => Promise<ReadStreamResult[]>
    xgroupAsync: (...args: unknown[]) => Promise<'OK'>
    xreadgroupAsync: (...args: unknown[]) => Promise<ReadStreamResult[]>
  }

  interface Multi {
    xadd: (...args: unknown[]) => string
    execAsync: () => Promise<string[]>
  }
}

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

const { now } = Date

let cachedClient: redis.RedisClient | null = null

const STREAM_MAXLEN: { [S in Stream]: number } = {
  'device:index': 10_000,
  'device:raw': 1_000_000,
  'provider:event': 100_000
}

async function getClient() {
  if (!cachedClient) {
    const { REDIS_HOST: host = 'localhost', REDIS_PORT: port = 6379 } = process.env
    logger.info(`connecting to redis on ${host}:${port}`)
    cachedClient = redis.createClient(Number(port), host)
    cachedClient.on('error', async err => {
      await logger.error(`redis error ${err}`)
    })
    await cachedClient.dbsizeAsync().then(size => logger.info(`redis has ${size} keys`))
  }
  return cachedClient
}

async function initialize() {
  if (env.SINK) {
    getBinding()
  } else {
    await getClient()
  }
}

async function reset() {
  const client = await getClient()
  await client.flushdbAsync().then(() => logger.info('redis flushed'))
}

async function startup() {
  await getClient()
}

async function shutdown() {
  if (cachedClient) {
    await cachedClient.quit()
    cachedClient = null
  }
}

async function writeStream(stream: Stream, field: string, value: unknown) {
  const client = await getClient()
  return client.xaddAsync(stream, 'MAXLEN', '~', STREAM_MAXLEN[stream], '*', field, JSON.stringify(value))
}

async function writeStreamBatch(stream: Stream, field: string, values: unknown[]) {
  const client = await getClient()
  const batch = client.batch()
  values.forEach(value => batch.xadd(stream, 'MAXLEN', '~', STREAM_MAXLEN[stream], '*', field, JSON.stringify(value)))
  await batch.execAsync()
}

// put basics of vehicle in the cache
async function writeDevice(device: Device) {
  if (env.SINK) {
    return writeCloudEvent('mds.device', JSON.stringify(device))
  }
  return writeStream(DEVICE_INDEX_STREAM, 'data', device)
}

async function writeEvent(event: VehicleEvent) {
  if (env.SINK) {
    return writeCloudEvent('mds.event', JSON.stringify(event))
  }
  return Promise.all([DEVICE_RAW_STREAM, PROVIDER_EVENT_STREAM].map(stream => writeStream(stream, 'event', event)))
}

// put latest locations in the cache
async function writeTelemetry(telemetry: Telemetry[]) {
  if (env.SINK) {
    await Promise.all(telemetry.map(item => writeCloudEvent('mds.telemetry', JSON.stringify(item))))
    return
  }
  const start = now()
  await writeStreamBatch(DEVICE_RAW_STREAM, 'telemetry', telemetry)
  const delta = now() - start
  if (delta > 200) {
    logger.info('stream writeTelemetry', telemetry.length, 'points in', delta, 'ms')
  }
}

async function readStream(
  stream: Stream,
  id: StreamItemID,
  { count, block }: ReadStreamOptions
): Promise<ReadStreamResult> {
  const client = await getClient()

  const results = await client.xreadAsync([
    ...(typeof block === 'number' ? ['BLOCK', block] : []),
    ...(typeof count === 'number' ? ['COUNT', count] : []),
    'STREAMS',
    stream,
    id || '$'
  ])

  if (results) {
    const [result] = results
    return result
  }

  return [stream, []]
}

async function createStreamGroup(stream: Stream, group: string) {
  const client = await getClient()
  return client.xgroupAsync('CREATE', stream, `${stream}::${group}`, 0, 'MKSTREAM')
}

async function readStreamGroup(
  stream: Stream,
  group: string,
  consumer: string,
  id: StreamItemID,
  { count, block, noack }: ReadStreamOptions
): Promise<ReadStreamResult> {
  const client = await getClient()

  const results = await client.xreadgroupAsync(
    'GROUP',
    `${stream}::${group}`,
    consumer,
    ...[
      ...(typeof block === 'number' ? ['BLOCK', block] : []),
      ...(typeof count === 'number' ? ['COUNT', count] : []),
      ...(noack ? ['NOACK'] : []),
      'STREAMS',
      stream,
      id || '>'
    ]
  )

  if (results) {
    const [result] = results
    return result
  }

  return [stream, []]
}

async function getStreamInfo(stream: Stream) {
  const client = await getClient()
  try {
    const [
      ,
      length,
      ,
      radixTreeKeys,
      ,
      radixTreeNodes,
      ,
      groups,
      ,
      lastGeneratedId,
      ,
      firstEntry,
      ,
      lastEntry
    ] = await client.xinfoAsync('STREAM', stream)
    return { length, radixTreeKeys, radixTreeNodes, groups, lastGeneratedId, firstEntry, lastEntry }
  } catch (err) {
    return null
  }
}

async function health() {
  if (env.SINK) {
    return Promise.resolve({ using: 'cloudevents-emitter', status: true, stats: {} })
  }
  const client = await getClient()
  const status = await client.pingAsync('connected')
  return { using: 'redis', status }
}

export = {
  createStreamGroup,
  getStreamInfo,
  health,
  initialize,
  readStream,
  readStreamGroup,
  reset,
  shutdown,
  startup,
  writeDevice,
  writeEvent,
  writeStream,
  writeStreamBatch,
  writeTelemetry
}
