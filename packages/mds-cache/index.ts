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

import log from '@mds-core/mds-logger'

import distance from 'geo-distance'
import flatten from 'flat'
import { capitalizeFirst, nullKeys, stripNulls, now, isInsideBoundingBox } from '@mds-core/mds-utils'
import {
  UUID,
  Timestamp,
  Device,
  VehicleEvent,
  Telemetry,
  BoundingBox,
  EVENT_STATUS_MAP,
  VEHICLE_STATUSES
} from '@mds-core/mds-types'
import redis from 'redis'
import bluebird from 'bluebird'

import { parseTelemetry, parseEvent, parseDevice, parseCachedItem } from './unflatteners'
import {
  CacheReadDeviceResult,
  CachedItem,
  StringifiedCacheReadDeviceResult,
  StringifiedEventWithTelemetry,
  StringifiedTelemetry,
  StringifiedEvent
} from './types'

const { env } = process

const { unflatten } = flatten

declare module 'redis' {
  interface RedisClient {
    dbsizeAsync: () => Promise<number>
    delAsync: (...arg1: string[]) => Promise<number>
    flushdbAsync: () => Promise<'OK'>
    hdelAsync: (...args: (string | number)[]) => Promise<number>
    hgetallAsync: (arg1: string) => Promise<{ [key: string]: string }>
    hmsetAsync: (...args: unknown[]) => Promise<'OK'>
    infoAsync: () => Promise<string>
    keysAsync: (arg1: string) => Promise<string[]>
    zaddAsync: (arg1: string | number, arg2: number, arg3: string) => Promise<number>
    zrangebyscoreAsync: (key: string, min: number | string, max: number | string) => Promise<string[]>
    georadiusAsync: (
      key: string,
      longitude: number,
      latitude: number,
      radius: number,
      unit: string
    ) => Promise<string[]>
  }
}

bluebird.promisifyAll(redis.RedisClient.prototype)

let cachedClient: redis.RedisClient | null

async function getClient() {
  if (!cachedClient) {
    const port = Number(env.REDIS_PORT) || 6379
    const host = env.REDIS_HOST || 'localhost'
    log.info(`connecting to redis on ${host}:${port}`)
    cachedClient = redis.createClient({ port, host, password: env.REDIS_PASS })
    log.info('redis client created')
    cachedClient.on('connect', () => {
      log.info('redis cache connected')
    })
    cachedClient.on('error', async err => {
      await log.error(`redis cache error ${err}`)
    })
    try {
      const size = await cachedClient.dbsizeAsync()
      log.info(`redis cache has ${size} keys`)
    } catch (err) {
      await log.error('redis failed to get dbsize', err)
    }
  }
  return cachedClient
}

async function info() {
  const results = await (await getClient()).infoAsync()
  const lines = results.split('\r\n')
  const data: { [propName: string]: string | number } = {}
  lines.map(line => {
    const [key, val] = line.split(':')
    if (val !== undefined) {
      if (Number.isNaN(Number(val))) {
        data[key] = val
      } else {
        data[key] = parseFloat(val)
      }
    }
  })
  return data
}

// update the ordered list of (device_id, timestamp) tuples
// so that we can trivially get a list of "updated since ___" device_ids
async function updateVehicleList(device_id: UUID, timestamp?: Timestamp) {
  const when = timestamp || now()
  // log.info('redis zadd', device_id, when)
  return (await getClient()).zaddAsync('device-ids', when, device_id)
}
async function hread(suffix: string, device_id: UUID): Promise<CachedItem> {
  if (!device_id) {
    throw new Error(`hread: tried to read ${suffix} for device_id ${device_id}`)
  }
  const key = `device:${device_id}:${suffix}`
  const flat = await (await getClient()).hgetallAsync(key)
  if (flat) {
    return unflatten({ ...flat, device_id })
  }
  throw new Error(`${suffix} for ${device_id} not found`)
}

async function addGeospatialHash(key: string, coordinates: [number, number]) {
  const client = await getClient()
  const [lat, lng] = coordinates
  const res = await client.geoadd('locations', lng, lat, key)
  return res
}

async function getEventsInBbox(bbox: BoundingBox) {
  const client = await getClient()
  const [pt1, pt2] = bbox
  const [lng, lat] = [(pt1[0] + pt2[0]) / 2, (pt1[1] + pt2[1]) / 2]
  const [radius, unit] = distance
    .between(pt1, pt2)
    .toString()
    .split(' ')
  return client.georadiusAsync('locations', lng, lat, radius, unit)
}

async function hreads(suffixes: string[], device_ids: UUID[]): Promise<CachedItem[]> {
  if (suffixes === undefined) {
    throw new Error('hreads: no suffixes')
  }
  if (device_ids === undefined) {
    throw new Error('hreads: no device_ids')
  }
  // bleah
  const multi = (await getClient()).multi()

  suffixes.map(suffix => device_ids.map(device_id => multi.hgetall(`device:${device_id}:${suffix}`)))

  /* eslint-reason external lib weirdness */
  /* eslint-disable-next-line promise/avoid-new */
  return new Promise((resolve, reject) => {
    /* eslint-reason external lib weirdness */
    /* eslint-disable-next-line promise/prefer-await-to-callbacks */
    multi.exec(async (err, replies) => {
      if (err) {
        await log.error('hreads', err)
        reject(err)
      } else {
        resolve(
          replies.map((flat, index) => {
            if (flat) {
              const flattened = { ...flat, device_id: device_ids[index % device_ids.length] }
              return unflatten(flattened)
            }
            return unflatten(null)
          })
        )
      }
    })
  })
}

async function readDevice(device_id: UUID) {
  if (!device_id) {
    throw new Error('null device not legal to read')
  }
  // log.info('redis read device', device_id)
  return parseDevice((await hread('device', device_id)) as StringifiedCacheReadDeviceResult)
}

async function readDevices(device_ids: UUID[]) {
  // log.info('redis read device', device_id)
  return ((await hreads(['device'], device_ids)) as StringifiedCacheReadDeviceResult[]).map(device => {
    return parseDevice(device)
  })
}

/* eslint-reason redis external lib weirdness */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/catch-or-return */
async function readDevicesStatus(query: { since?: number; skip?: number; take?: number; bbox: BoundingBox }) {
  log.info('readDevicesStatus', JSON.stringify(query), 'start')
  const start = query.since || 0
  const stop = now()

  log.info('redis zrangebyscore device-ids', start, stop)
  const client = await getClient()

  const { bbox } = query
  const deviceIdsInBbox = await getEventsInBbox(bbox)
  const deviceIdsRes =
    deviceIdsInBbox.length === 0 ? await client.zrangebyscoreAsync('device-ids', start, stop) : deviceIdsInBbox
  const skip = query.skip || 0
  const take = query.take || 100000000000
  const deviceIds = deviceIdsRes.slice(skip, skip + take)

  const deviceStatusMap: { [device_id: string]: CachedItem | {} } = {}

  const events = ((await hreads(['event'], deviceIds)) as StringifiedEvent[])
    .reduce((acc: VehicleEvent[], item: StringifiedEventWithTelemetry) => {
      try {
        const parsedItem = parseEvent(item)
        if (
          EVENT_STATUS_MAP[parsedItem.event_type] !== VEHICLE_STATUSES.removed &&
          (parsedItem.telemetry && isInsideBoundingBox(parsedItem.telemetry, query.bbox))
        )
          return [...acc, parsedItem]
        return acc
      } catch (err) {
        return acc
      }
    }, [])
    .filter(item => Boolean(item))

  const eventDeviceIds = events.map(event => event.device_id)
  const devices = (await hreads(['device'], eventDeviceIds))
    .reduce((acc: (Device | Telemetry | VehicleEvent)[], item: CachedItem) => {
      try {
        const parsedItem = parseCachedItem(item)
        return [...acc, parsedItem]
      } catch (err) {
        return acc
      }
    }, [])
    .filter(item => Boolean(item))
  const all = [...devices, ...events]
  all.map(item => {
    deviceStatusMap[item.device_id] = deviceStatusMap[item.device_id] || {}
    Object.assign(deviceStatusMap[item.device_id], item)
  })
  const values = Object.values(deviceStatusMap)

  return values.filter((item: any) => item.telemetry)
}

// get the provider for a device
async function getProviderId(device_id: UUID) {
  return (await readDevice(device_id)).provider_id
}

// initial set of stats are super-simple: last-written values for device, event, and telemetry
async function updateProviderStats(suffix: string, device_id: UUID, timestamp: Timestamp | undefined | null) {
  try {
    const provider_id = await getProviderId(device_id)
    return (await getClient()).hmsetAsync(
      `provider:${provider_id}:stats`,
      `last${capitalizeFirst(suffix)}`,
      timestamp || now()
    )
  } catch (err) {
    const msg = `cannot updateProviderStats for unknown ${device_id}: ${err.message}`
    await log.warn(msg)
    return Promise.resolve(msg)
  }
}

// anything with a device_id, e.g. device, telemetry, etc.
async function hwrite(suffix: string, item: CacheReadDeviceResult | Telemetry | VehicleEvent) {
  if (typeof item.device_id !== 'string') {
    await log.error(`hwrite: invalid device_id ${item.device_id}`)
    throw new Error(`hwrite: invalid device_id ${item.device_id}`)
  }
  const { device_id } = item
  const key = `device:${device_id}:${suffix}`
  const flat: { [key: string]: unknown } = flatten(item)
  const nulls = nullKeys(flat)
  const hmap = stripNulls(flat) as { [key: string]: unknown; device_id: UUID }
  delete hmap.device_id

  if (nulls.length > 0) {
    // redis doesn't store null keys, so we have to delete them
    // TODO unit-test
    await (await getClient()).hdelAsync(key, ...nulls)
  }

  await (await getClient()).hmsetAsync(key, hmap)
  if ('timestamp' in item) {
    return Promise.all([
      // make sure the device list is updated (per-provider)
      updateVehicleList(device_id, item.timestamp),
      // update last-written values
      updateProviderStats(suffix, device_id, item.timestamp)
    ])
  }
  return Promise.all([
    // make sure the device list is updated (per-provider)
    updateVehicleList(device_id),
    // update last-written values
    updateProviderStats(suffix, device_id, null)
  ])
}

// put basics of device in the cache
async function writeDevice(device: Device) {
  if (!device) {
    throw new Error('null device not legal to write')
  }
  return hwrite('device', device)
}

async function writeEvent(event: VehicleEvent) {
  // FIXME cope with out-of-order -- check timestamp
  // log.info('redis write event', event.device_id)
  try {
    const prev_event = parseEvent((await hread('event', event.device_id)) as StringifiedEventWithTelemetry)
    if (prev_event.timestamp < event.timestamp) {
      try {
        if (event.telemetry) {
          const { lat, lng } = event.telemetry.gps
          await addGeospatialHash(event.device_id, [lat, lng])
        }
        return hwrite('event', event)
      } catch (err) {
        await log.error('hwrites', err.stack)
        throw err
      }
    } else {
      return null
    }
  } catch (_) {
    try {
      if (event.telemetry) {
        const { lat, lng } = event.telemetry.gps
        await addGeospatialHash(event.device_id, [lat, lng])
      }
      return hwrite('event', event)
    } catch (err) {
      await log.error('hwrites', err.stack)
      throw err
    }
  }
}

async function readEvent(device_id: UUID): Promise<VehicleEvent> {
  // log.info('redis read event', device_id)
  log.info('redis read event for', device_id)
  const event = await hread('event', device_id)
  return parseEvent(event as StringifiedEventWithTelemetry)
}

async function readEvents(device_ids: UUID[]): Promise<VehicleEvent[]> {
  const events = await hreads(['event'], device_ids)
  return events
    .map(e => {
      return parseEvent(e as StringifiedEventWithTelemetry)
    })
    .filter(e => !!e)
}

async function readKeys(pattern: string) {
  return (await getClient()).keysAsync(pattern)
}

async function readAllEvents() {
  // FIXME wildcard searching is slow
  const keys = await readKeys('device:*:event')
  const device_ids = keys.map(key => {
    const [, device_id] = key.split(':')
    return device_id
  })
  return (await hreads(['event'], device_ids)).map(event => {
    return parseEvent(event as StringifiedEventWithTelemetry)
  })
}

async function readTelemetry(device_id: UUID): Promise<Telemetry> {
  // log.info('redis read telemetry for', device_id)
  const telemetry = await hread('telemetry', device_id)
  return parseTelemetry(telemetry as StringifiedTelemetry)
}

async function writeOneTelemetry(telemetry: Telemetry) {
  const { lat, lng } = telemetry.gps
  try {
    const prevTelemetry = await readTelemetry(telemetry.device_id)
    if (prevTelemetry.timestamp < telemetry.timestamp) {
      try {
        await addGeospatialHash(telemetry.device_id, [lat, lng])
        return hwrite('telemetry', telemetry)
      } catch (err) {
        await log.error('hwrite', err.stack)
        return Promise.reject(err)
      }
    } else {
      return Promise.resolve()
    }
  } catch (err) {
    log.info('writeOneTelemetry: no prior telemetry found:', err.message)
    try {
      await addGeospatialHash(telemetry.device_id, [lat, lng])
      return hwrite('telemetry', telemetry)
    } catch (err2) {
      await log.error('writeOneTelemetry hwrite2', err.stack)
      return Promise.reject(err2)
    }
  }
}

async function writeTelemetry(telemetries: Telemetry[]) {
  await Promise.all(telemetries.map(telemetry => writeOneTelemetry(telemetry)))
}

async function readAllTelemetry() {
  // FIXME wildcard searching is slow
  const keys = await readKeys('device:*:telemetry')
  const device_ids = keys.map(key => {
    const [, device_id] = key.split(':')
    return device_id
  })
  return ((await hreads(['telemetry'], device_ids)) as StringifiedTelemetry[]).reduce((acc: Telemetry[], telemetry) => {
    try {
      return [...acc, parseTelemetry(telemetry)]
    } catch (err) {
      log.info(JSON.parse(err))
      return acc
    }
  }, [])
}

async function wipeDevice(device_id: UUID) {
  const keys = await readKeys(`*:${device_id}:*`)
  if (keys.length > 0) {
    log.info('del', ...keys)
    return (await getClient()).delAsync(...keys)
  }
  log.info('no keys found for', device_id)
  return 0
}

async function readProviderStats(provider_id: UUID) {
  const key = `provider:${provider_id}:stats`
  const flat = await (await getClient()).hgetallAsync(key)
  if (!flat) {
    throw new Error(`no stats found for provider_id ${provider_id}`)
  } else {
    return unflatten(flat)
  }
}

async function seed(dataParam: { devices: Device[]; events: VehicleEvent[]; telemetry: Telemetry[] }) {
  log.info('cache seed')
  const data = dataParam || {
    devices: [],
    events: [],
    telemetry: []
  }
  //  log.info('cache seed redis', Object.keys(data).map(key => `${key} (${data[key].length})`))
  //  log.info('cache seed redis', Object.keys(data).forEach(key => `${key} (${data[key].length})`))

  await data.devices.map(writeDevice)
  await data.events.map(writeEvent)
  if (data.telemetry.length !== 0) {
    await writeTelemetry(data.telemetry.sort((a, b) => a.timestamp - b.timestamp))
  }
  log.info('cache seed redis done')
}

async function reset() {
  log.info('cache reset')
  await (await getClient()).flushdbAsync()
  return log.info('redis flushed')
}

async function initialize() {
  await getClient()
  await reset()
}

async function startup() {
  await getClient()
}

function shutdown() {
  if (cachedClient) {
    cachedClient.quit()
    cachedClient = null
  }
}

async function health() {
  // FIXME
  return Promise.resolve('we good')
}

// remove stale keys, if any
// this was needed to clean up from failing to verify that a device was legit
async function cleanup() {
  try {
    const keys = await readKeys('device:*')
    await log.warn('cleanup: read', keys.length)
    const report: { telemetry: number; device: number; event: number; [suffix: string]: number } = {
      telemetry: 0,
      device: 0,
      event: 0
    }
    try {
      // look for bogus keys
      let badKeys: string[] = []
      keys.map(key => {
        const [, , suffix] = key.split(':')
        if (suffix) {
          badKeys.push(key)
          report[suffix] += 1
        }
      })
      // let's just purge a few as an experiment
      badKeys = badKeys.slice(0, 10000)
      const result = await (await getClient()).delAsync(...badKeys)
      // return a wee report
      report.deleted = result
      return report
    } catch (ex) {
      await log.error('cleanup: exception', ex)
      throw ex
    }
  } catch (ex) {
    await log.error('cleanup: exception', ex)
    return Promise.reject(ex)
  }
}

export default {
  initialize,
  health,
  info,
  seed,
  reset,
  startup,
  shutdown,
  writeDevice,
  writeEvent,
  writeOneTelemetry,
  writeTelemetry,
  readDevice,
  readDevices,
  readDevicesStatus,
  readEvent,
  readEvents,
  readAllEvents,
  readTelemetry,
  readAllTelemetry,
  readProviderStats,
  readKeys,
  wipeDevice,
  updateVehicleList,
  cleanup
}
