/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { isTimestamp, now, days, inc, head, tail } from '@mds-core/mds-utils'
import { UUID, CountMap, TripsStats, VEHICLE_EVENTS, VehicleEvent } from '@mds-core/mds-types'
import cache from '@mds-core/mds-agency-cache'
import logger from '@mds-core/mds-logger'

// TODO move to utils?
export function asInt(n: string | number | undefined): number | undefined {
  if (n === undefined) {
    return undefined
  }
  if (typeof n === 'number') {
    return n
  }
  if (typeof n === 'string') {
    return parseInt(n)
  }
}

export function startAndEnd(
  params: Partial<{ start_time: number | string | undefined; end_time: number | string | undefined }>
): Partial<{ start_time: number | undefined; end_time: number | undefined }> {
  const { start_time, end_time } = params

  const start_time_out: number | undefined = asInt(start_time)
  const end_time_out: number | undefined = asInt(end_time)

  if (start_time_out !== undefined) {
    if (Number.isNaN(start_time_out) || !isTimestamp(start_time_out)) {
      throw new Error(`invalid start_time ${start_time}`)
    }
  }
  if (end_time_out !== undefined) {
    if (Number.isNaN(end_time_out) || !isTimestamp(end_time_out)) {
      throw new Error(`invalid end_time ${end_time}`)
    }
  }

  if (start_time_out !== undefined && end_time_out === undefined) {
    if (now() - start_time_out > days(7)) {
      throw new Error('queries over 1 week not supported')
    }
  }
  if (start_time_out !== undefined && end_time_out !== undefined) {
    if (end_time_out - start_time_out > days(7)) {
      throw new Error('queries over 1 week not supported')
    }
  }
  return {
    start_time: start_time_out,
    end_time: end_time_out
  }
}

export interface TripsData {
  [s: string]: { provider_id: UUID; trip_id: UUID; eventTypes: { [n: number]: string } }
}
// NOTE: experimental code while we learn how to interpret trip data
export function categorizeTrips(perTripId: TripsData): { [s: string]: TripsStats } {
  const perProvider: { [s: string]: TripsStats } = {}
  Object.keys(perTripId).map((trip_id: UUID) => {
    const trip = perTripId[trip_id]
    const pid: UUID = trip.provider_id
    perProvider[pid] = perProvider[pid] || {}
    const counts: CountMap = {}
    const events: string[] = Object.keys(trip.eventTypes)
      .sort()
      .map((key: string) => trip.eventTypes[parseInt(key)])
    if (events.length === 1) {
      inc(counts, 'single') // single: one-off
      perProvider[pid].singles = perProvider[pid].singles || {}
      inc(perProvider[pid].singles, head(events))
    } else if (head(events) === VEHICLE_EVENTS.trip_start && tail(events) === VEHICLE_EVENTS.trip_end) {
      inc(counts, 'simple') // simple: starts with start, ends with end
    } else if (head(events) === VEHICLE_EVENTS.trip_start) {
      if (tail(events) === VEHICLE_EVENTS.trip_leave) {
        inc(counts, 'left') // left: started with start, ends with leave
      } else {
        inc(counts, 'noEnd') // noEnd: started with start, did not end with end or leave
      }
    } else if (tail(events) === VEHICLE_EVENTS.trip_end) {
      if (head(events) === VEHICLE_EVENTS.trip_enter) {
        inc(counts, 'entered') // entered: started with enter, ends with end
      } else {
        inc(counts, 'noStart') // noStart: weird start, ends with end
      }
    } else if (head(events) === VEHICLE_EVENTS.trip_enter && tail(events) === VEHICLE_EVENTS.trip_leave) {
      inc(counts, 'flyby') // flyby: starts with enter, ends with leave
    } else {
      inc(counts, 'mystery') // mystery: weird non-conforming trip
      perProvider[pid].mysteries = perProvider[pid].mysteries || {}
      const key = events.map(event => event.replace('trip_', '')).join('-')
      inc(perProvider[pid].mysteries, key)

      perProvider[pid].mystery_examples = perProvider[pid].mystery_examples || {}
      perProvider[pid].mystery_examples[key] = perProvider[pid].mystery_examples[key] || []
      if (perProvider[pid].mystery_examples[key].length < 10) {
        perProvider[pid].mystery_examples[key].push(trip_id)
      }
    }
    Object.assign(perProvider[pid], counts)
  })
  return perProvider
}

export async function getMaps(): Promise<{
  eventMap: { [s: string]: VehicleEvent }
  // telemetryMap: { [s: string]: Telemetry }
}> {
  try {
    // const telemetry: Telemetry[] = await cache.readAllTelemetry()
    // logger.info('read telemetry')
    const events = await cache.readAllEvents()
    logger.info('read events')
    const eventSeed: { [s: string]: VehicleEvent } = {}
    const eventMap: { [s: string]: VehicleEvent } = events.reduce((map, event) => {
      return event ? Object.assign(map, { [event.device_id]: event }) : map
    }, eventSeed)
    // const telemetrySeed: { [s: string]: Telemetry } = {}
    // const telemetryMap = telemetry.reduce((map, t) => {
    //   return Object.assign(map, { [t.device_id]: t })
    // }, telemetrySeed)
    return Promise.resolve({
      // telemetryMap,
      eventMap
    })
  } catch (err) {
    return Promise.reject(err)
  }
}
