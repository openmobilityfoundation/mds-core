/*
    Copyright 2019-2020 City of Los Angeles.

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

import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import { UUID, VEHICLE_TYPE, PROPULSION_TYPE, Device } from '@mds-core/mds-types'
import { NotFoundError } from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'
import { MessageLabeler } from './types'

interface MemCacheOptions {
  size: number
}

const MemCache = <TKey extends keyof T, T>(
  load: (key: T[TKey]) => Promise<T | undefined>,
  { size = 1000 }: Partial<MemCacheOptions> = {}
) => {
  const memcache = new Map<T[TKey], T>()
  logger.info('MapCache Initialized', { size })
  return async (key: T[TKey]): Promise<T | undefined> => {
    const value = memcache.get(key) ?? (await load(key))
    if (value) {
      if (memcache.has(key)) {
        // Key is deleted and moved to end of Map (MRU)
        memcache.delete(key)
      } else if (memcache.size === size) {
        // Evict LRU key on cache full
        const [[LRU]] = memcache
        memcache.delete(LRU)
      }
      // MRU key is added to end of Map
      memcache.set(key, value)
      return value
    }
    return undefined
  }
}

export interface DeviceLabel {
  vehicle_type: VEHICLE_TYPE
  vehicle_propulsion: PROPULSION_TYPE[]
}

type DeviceLabelerOptions = MemCacheOptions

const loadDevice = async (device_id: UUID) => {
  try {
    const device = await cache.readDevice(device_id)
    if (device) {
      return device
    }
  } catch {
    // Ignore cache miss
  }
  return db.readDevice(device_id)
}

export const DeviceLabeler: (
  options?: Partial<DeviceLabelerOptions>
) => MessageLabeler<{ device_id: UUID }, DeviceLabel> = options => {
  const deviceCache = MemCache<'device_id', Device>(async device_id => {
    try {
      const device = await loadDevice(device_id)
      return device
    } catch (error) {
      logger.error(error)
    }
    return undefined
  }, options)
  return async ({ device_id }) => {
    const device = await deviceCache(device_id)
    if (!device) {
      throw new NotFoundError(`Device not found`, { device_id })
    }
    const { type: vehicle_type, propulsion: vehicle_propulsion } = device
    return { vehicle_type, vehicle_propulsion }
  }
}
