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

import { isInsideBoundingBox } from 'mds-utils'
import { VehicleEvent, Device, Telemetry, BoundingBox } from 'mds'
import { EVENT_STATUS_MAP, VEHICLE_STATUSES } from 'mds-enums'
import log from 'mds-logger'
import db from 'mds-db'
import cache from 'mds-cache'
import { CacheReadDeviceResult } from 'mds-cache/types'

async function getVehicles(
  skip: number,
  take: number,
  url: string,
  provider_id: string,
  reqQuery: any,
  bbox?: BoundingBox
): Promise<{
  total: number
  links: { first: string; last: string; prev: string | null; next: string | null }
  vehicles: (Device & { updated?: number | null; telemetry?: Telemetry | null })[]
}> {
  function fmt(query: { skip: number; take: number }): string {
    const flat = Object.assign({}, reqQuery, query)
    let s = `${url}?`
    s += Object.keys(flat)
      .map(key => `${key}=${flat[key]}`)
      .join('&')
    return s
  }

  const rows = await db.readDeviceIds(provider_id)
  const total = rows.length
  log.info(`read ${total} deviceIds in /vehicles`)

  const events = await cache.readEvents(rows.map(record => record.device_id))
  const eventMap: { [s: string]: VehicleEvent } = {}
  events.map(event => {
    if (event) {
      eventMap[event.device_id] = event
    }
  })

  const deviceIdSuperset = bbox
    ? rows.filter(record => {
        return eventMap[record.device_id] ? isInsideBoundingBox(eventMap[record.device_id].telemetry, bbox) : true
      })
    : rows

  const deviceIdSubset = deviceIdSuperset.slice(skip, skip + take).map(record => record.device_id)
  const devices = await cache.readDevices(deviceIdSubset)
  devices.map((device: CacheReadDeviceResult) => {
    if (!device) {
      throw new Error('device in DB but not in cache')
    }
    const event = eventMap[device.device_id]
    /* eslint-disable no-param-reassign */
    device.status = event ? EVENT_STATUS_MAP[event.event_type] : VEHICLE_STATUSES.removed
    device.telemetry = event ? event.telemetry : null
    device.updated = event ? event.timestamp : null
    /* eslint-enable no-param-reassign */
  })

  const noNext = skip + take >= deviceIdSuperset.length
  const noPrev = skip === 0 || skip > deviceIdSuperset.length
  const lastSkip = take * Math.floor(deviceIdSuperset.length / take)

  return {
    total,
    links: {
      first: fmt({
        skip: 0,
        take
      }),
      last: fmt({
        skip: lastSkip,
        take
      }),
      prev: noPrev
        ? null
        : fmt({
            skip: skip - take,
            take
          }),
      next: noNext
        ? null
        : fmt({
            skip: skip + take,
            take
          })
    },
    vehicles: devices
  }
}

export = {
  getVehicles
}
