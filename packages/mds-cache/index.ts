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

import log from 'mds-logger'

import flatten from 'flat'
import { capitalizeFirst, nullKeys, stripNulls, now } from 'mds-utils'
import { UUID, Timestamp, Device, VehicleEvent, Telemetry, BoundingBox } from 'mds'
import redis from 'redis'
import bluebird from 'bluebird'
import { parseTelemetry, parseEvent, parseDevice } from './unflatteners'
import {
  CacheReadDeviceResult,
  CachedItem,
  StringifiedCacheReadDeviceResult,
  StringifiedEventWithTelemetry,
  StringifiedTelemetry
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
  }
}

bluebird.promisifyAll(redis.RedisClient.prototype)

let cachedClient: redis.RedisClient | null

function insideBBox(status: CachedItem | {}, bbox: BoundingBox) {
  if (!status || !('gps' in status)) {
    return false
  }

  const telemetry = parseTelemetry(status)
  const { lat, lng } = telemetry.gps
  return bbox.latMin <= lat && lat <= bbox.latMax && bbox.lngMin <= lng && lng <= bbox.lngMax
}

function getClient(): redis.RedisClient {
  if (!cachedClient) {
    const port = Number(env.REDIS_PORT) || 6379
    const host = env.REDIS_HOST || 'localhost'
    log.info(`connecting to redis on ${host}:${port}`)
    cachedClient = redis.createClient({ port, host, password: env.REDIS_PASS })
    log.info('redis client created')
    cachedClient.on('connect', () => {
      log.info('redis cache connected')
    })
    cachedClient.on('error', err => {
      log.error(`redis cache error ${err}`)
    })

    cachedClient
      .dbsizeAsync()
      .then(
        (size: number) => {
          log.info(`redis cache has ${size} keys`)
        },
        err => {
          log.error('redis failed to get dbsize', err)
        }
      )
      .catch(err => {
        log.error('redis uncaught during dbsize', err.stack)
      })
  }
  return cachedClient
}

async function info() {
  return getClient()
    .infoAsync()
    .then((results: string) => {
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
    })
}

// update the ordered list of (device_id, timestamp) tuples
// so that we can trivially get a list of "updated since ___" device_ids
async function updateVehicleList(device_id: UUID, timestamp?: Timestamp) {
  const when = timestamp || now()
  // log.info('redis zadd', device_id, when)
  return getClient().zaddAsync('device-ids', when, device_id)
}
async function hread(suffix: string, device_id: UUID): Promise<CachedItem> {
  if (!device_id) {
    throw new Error(`hread: tried to read ${suffix} for device_id ${device_id}`)
  }
  const key = `device:${device_id}:${suffix}`
  return new Promise((resolve, reject) => {
    return getClient()
      .hgetallAsync(key)
      .then(flat => {
        if (flat) {
          resolve(unflatten({ ...flat, device_id }))
        } else {
          // log.info(`hread: ${suffix} for ${device_id} not found`)
          reject(new Error(`${suffix} for ${device_id} not found`))
        }
      })
  })
}

async function hreads(suffixes: string[], device_ids: UUID[]): Promise<CachedItem[]> {
  if (suffixes === undefined) {
    throw new Error('hreads: no suffixes')
  }
  if (device_ids === undefined) {
    throw new Error('hreads: no device_ids')
  }
  // bleah
  const multi = getClient().multi()

  suffixes.map(suffix => device_ids.map(device_id => multi.hgetall(`device:${device_id}:${suffix}`)))

  return new Promise((resolve, reject) => {
    multi.exec((err, replies) => {
      if (err) {
        log.error('hreads', err)
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

async function readDevicesStatus(query: { since?: number; skip?: number; take?: number; bbox: BoundingBox }) {
  log.info('readDevicesStatus', JSON.stringify(query), 'start')
  return new Promise(resolve => {
    const start = query.since || 0
    const stop = now()
    // read all device ids
    log.info('redis zrangebyscore device-ids', start, stop)
    getClient()
      .zrangebyscoreAsync('device-ids', start, stop)
      .then(async (device_ids_res: string[]) => {
        log.info('readDevicesStatus', device_ids_res.length, 'entries')

        const skip = query.skip || 0
        const take = query.take || 100000000000
        const device_ids = device_ids_res.slice(skip, skip + take)

        // read all devices
        const device_status_map: { [device_id: string]: CachedItem | {} } = {}

        // big batch redis nightmare!
        let all: CachedItem[] = await hreads(['device', 'event', 'telemetry'], device_ids)
        all = all.filter((item: CachedItem) => Boolean(item))
        all.map(item => {
          device_status_map[item.device_id] = device_status_map[item.device_id] || {}
          Object.assign(device_status_map[item.device_id], item)
        })
        log.info('readDevicesStatus', device_ids.length, 'entries:', all.length)

        // log.info('device_status_map', JSON.stringify(device_status_map))
        let values = Object.values(device_status_map)
        if (query.bbox) {
          values = values.filter((status: CachedItem | {}) => insideBBox(status, query.bbox))
        }

        log.info('readDevicesStatus done')
        resolve(values)
      })
  })
}

// get the provider for a device
async function getProviderId(device_id: UUID) {
  return readDevice(device_id).then(device => device.provider_id)
}

// initial set of stats are super-simple: last-written values for device, event, and telemetry
async function updateProviderStats(suffix: string, device_id: UUID, timestamp: Timestamp | undefined | null) {
  getProviderId(device_id).then(
    provider_id => {
      return getClient().hmsetAsync(
        `provider:${provider_id}:stats`,
        `last${capitalizeFirst(suffix)}`,
        timestamp || now()
      )
    },
    err => {
      const msg = `cannot updateProviderStats for unknown ${device_id}: ${err.message}`
      log.warn(msg)
      return Promise.resolve(msg)
    }
  )
}

// anything with a device_id, e.g. device, telemetry, etc.
async function hwrite(suffix: string, item: CacheReadDeviceResult | Telemetry | VehicleEvent) {
  if (typeof item.device_id !== 'string') {
    log.error(`hwrite: invalid device_id ${item.device_id}`)
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
    await getClient().hdelAsync(key, ...nulls)
  }

  await getClient().hmsetAsync(key, hmap)
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
        return hwrite('event', event)
      } catch (err) {
        log.error('hwrites', err.stack)
        return Promise.reject(err)
      }
    } else {
      return null
    }
  } catch (_) {
    try {
      return hwrite('event', event)
    } catch (err) {
      await log.error('hwrites', err.stack)
      return Promise.reject(err)
    }
  }
}

async function readEvent(device_id: UUID): Promise<VehicleEvent> {
  // log.info('redis read event', device_id)
  log.info('redis read event for', device_id)
  return new Promise((resolve, reject) => {
    hread('event', device_id)
      .then((event: CachedItem) => resolve(parseEvent(event as StringifiedEventWithTelemetry)))
      .catch((err: Error) => reject(err))
  })
}

async function readEvents(device_ids: UUID[]): Promise<VehicleEvent[]> {
  return new Promise((resolve, reject) => {
    hreads(['event'], device_ids)
      .then((events: CachedItem[]) =>
        resolve(
          events
            .map(e => {
              return parseEvent(e as StringifiedEventWithTelemetry)
            })
            .filter(e => !!e)
        )
      )
      .catch((err: Error) => reject(err))
  })
}

async function readKeys(pattern: string) {
  return getClient().keysAsync(pattern)
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
  return new Promise((resolve, reject) => {
    hread('telemetry', device_id)
      .then(telemetry => resolve(parseTelemetry(telemetry as StringifiedTelemetry)))
      .catch(err => reject(err))
  })
}

async function writeOneTelemetry(telemetry: Telemetry) {
  try {
    const prevTelemetry = await readTelemetry(telemetry.device_id)
    if (prevTelemetry.timestamp < telemetry.timestamp) {
      try {
        return hwrite('telemetry', telemetry)
      } catch (err) {
        log.error('hwrite', err.stack)
        return Promise.reject(err)
      }
    } else {
      return Promise.resolve()
    }
  } catch (err) {
    log.info('writeOneTelemetry: no prior telemetry found:', err.message)
    try {
      return hwrite('telemetry', telemetry)
    } catch (err2) {
      log.error('writeOneTelemetry hwrite2', err.stack)
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
      log.warn(JSON.parse(err))
      return acc
    }
  }, [])
}

async function wipeDevice(device_id: UUID) {
  return readKeys(`*:${device_id}:*`).then(keys => {
    if (keys.length > 0) {
      log.info('del', ...keys)
      return getClient().delAsync(...keys)
    }
    log.info('no keys found for', device_id)
    return Promise.resolve(0)
  })
}

async function readProviderStats(provider_id: UUID) {
  const key = `provider:${provider_id}:stats`
  return new Promise((resolve, reject) => {
    return getClient()
      .hgetallAsync(key)
      .then(flat => {
        if (!flat) {
          reject(new Error(`no stats found for provider_id ${provider_id}`))
        } else {
          resolve(unflatten(flat))
        }
      })
  })
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

function reset() {
  log.info('cache reset')
  return getClient()
    .flushdbAsync()
    .then(() => log.info('redis flushed'))
}

async function initialize() {
  getClient()
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
async function cleanup(deviceIdMap: { [device_id: string]: boolean }) {
  try {
    const keys = await readKeys('device:*')
    await log.warn('cleanup: read', keys.length)
    const report: { telemetry: number; device: number; event: number; [suffix: string]: number } = {
      telemetry: 0,
      device: 0,
      event: 0
    }
    return new Promise((resolve, reject) => {
      try {
        // look for bogus keys
        let badKeys: string[] = []
        keys.map(key => {
          const [, device_id, suffix] = key.split(':')
          if (deviceIdMap[device_id]) {
            // woot
          } else if (suffix) {
            badKeys.push(key)
            report[suffix] += 1
          }
        })
        // let's just purge a few as an experiment
        badKeys = badKeys.slice(0, 10000)
        getClient()
          .delAsync(...badKeys)
          .then((result: number) => {
            // return a wee report
            report.deleted = result
            resolve(report)
          })
      } catch (ex) {
        log.error('cleanup: exception', ex).then(() => reject(ex))
      }
      resolve(report)
    })
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
