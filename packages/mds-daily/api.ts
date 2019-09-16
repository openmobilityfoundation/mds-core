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

import express from 'express'

import log from '@mds-core/mds-logger'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import { providerName, isProviderId } from '@mds-core/mds-providers'
import areas from 'ladot-service-areas'
import {
  UUID,
  VehicleEvent,
  CountMap,
  TripsStats,
  VEHICLE_EVENTS,
  VEHICLE_STATUSES,
  EVENT_STATUS_MAP
} from '@mds-core/mds-types'
import {
  isUUID,
  isTimestamp,
  now,
  days,
  inc,
  pathsFor,
  head,
  tail,
  isStateTransitionValid,
  ServerError
} from '@mds-core/mds-utils'
import { DailyApiRequest, DailyApiResponse } from './types'

const SERVER_ERROR = {
  error: 'server_error',
  error_description: 'an internal server error has occurred and been logged'
}

function api(app: express.Express): express.Express {
  /**
   * Agency-specific middleware to extract provider_id into locals, do some logging, etc.
   */
  app.use(async (req: DailyApiRequest, res: DailyApiResponse, next) => {
    try {
      // verify presence of provider_id
      if (!(req.path.includes('/health') || req.path === '/')) {
        if (res.locals.claims) {
          const { provider_id, scope } = res.locals.claims

          // no admin access without auth
          if (req.path.includes('/admin/')) {
            if (!scope || !scope.includes('admin:all')) {
              return res.status(403).send({
                result: `no admin access without admin:all scope (${scope})`
              })
            }
          }

          if (provider_id) {
            if (!isUUID(provider_id)) {
              await log.warn(req.originalUrl, 'bogus provider_id', provider_id)
              return res.status(400).send({
                result: `invalid provider_id ${provider_id} is not a UUID`
              })
            }

            if (!isProviderId(provider_id)) {
              return res.status(400).send({
                result: `invalid provider_id ${provider_id} is not a known provider`
              })
            }

            log.info(providerName(provider_id), req.method, req.originalUrl)
          }
        } else {
          return res.status(401).send('Unauthorized')
        }
      }
    } catch (err) {
      /* istanbul ignore next */
      await log.error(req.originalUrl, 'request validation fail:', err.stack)
    }
    next()
  })

  // / ////////// gets ////////////////

  // ///////////////////// begin daily endpoints ///////////////////////

  const RIGHT_OF_WAY_STATUSES: string[] = [
    VEHICLE_STATUSES.available,
    VEHICLE_STATUSES.unavailable,
    VEHICLE_STATUSES.reserved,
    VEHICLE_STATUSES.trip
  ]

  function asInt(n: string | number | undefined): number | undefined {
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

  // TODO move to utils?
  function startAndEnd(
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

  app.get(pathsFor('/admin/vehicle_counts'), async (req: DailyApiRequest, res: DailyApiResponse) => {
    async function fail(err: Error | string): Promise<void> {
      await log.error('/admin/vehicle_counts fail', err)
      res.status(500).send({
        error: err
      })
    }

    async function getMaps(): Promise<{
      eventMap: { [s: string]: VehicleEvent }
      // telemetryMap: { [s: string]: Telemetry }
    }> {
      try {
        // const telemetry: Telemetry[] = await cache.readAllTelemetry()
        // log.info('read telemetry')
        const events: VehicleEvent[] = await cache.readAllEvents()
        log.info('read events')
        const eventSeed: { [s: string]: VehicleEvent } = {}
        const eventMap: { [s: string]: VehicleEvent } = events.reduce((map, event) => {
          return Object.assign(map, { [event.device_id]: event })
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

    try {
      const rows = await db.getVehicleCountsPerProvider()
      const stats: {
        provider_id: UUID
        provider: string
        count: number
        status: { [s: string]: number }
        event_type: { [s: string]: number }
        areas: { [s: string]: number }
        areas_12h: { [s: string]: number }
        areas_24h: { [s: string]: number }
        areas_48h: { [s: string]: number }
      }[] = rows.map(row => {
        const { provider_id, count } = row
        return {
          provider_id,
          provider: providerName(provider_id),
          count,
          status: {},
          event_type: {},
          areas: {},
          areas_12h: {},
          areas_24h: {},
          areas_48h: {}
        }
      })
      await log.info('/admin/vehicle_counts', JSON.stringify(stats))
      const HRS_12_AGO = now() - 43200000
      const HRS_24_AGO = now() - 86400000
      const HRS_48_AGO = now() - 172800000

      const maps = await getMaps()
      // TODO reimplement to be more efficient
      const { eventMap } = maps
      await Promise.all(
        stats.map(async stat => {
          const items = await db.readDeviceIds(stat.provider_id)
          items.map(item => {
            const event = eventMap[item.device_id]
            inc(stat.event_type, event ? event.event_type : 'default')
            const status = event ? EVENT_STATUS_MAP[event.event_type] : VEHICLE_STATUSES.removed
            inc(stat.status, status)
            // TODO latest-state should remove service_area_id if it's null
            if (event && RIGHT_OF_WAY_STATUSES.includes(status) && event.service_area_id) {
              const serviceArea = areas.serviceAreaMap[event.service_area_id]
              if (serviceArea) {
                inc(stat.areas, serviceArea.description)
                if (event.timestamp >= HRS_12_AGO) {
                  inc(stat.areas_12h, serviceArea.description)
                }
                if (event.timestamp >= HRS_24_AGO) {
                  inc(stat.areas_24h, serviceArea.description)
                }
                if (event.timestamp >= HRS_48_AGO) {
                  inc(stat.areas_48h, serviceArea.description)
                }
              }
            }
          })
        })
      )
      await log.info(JSON.stringify(stats))
      res.status(200).send(stats)
    } catch (err) {
      await fail(err)
    }
  })

  // read all the latest events out of the cache
  app.get(pathsFor('/admin/events'), async (req: DailyApiRequest, res: DailyApiResponse) => {
    const events = await cache.readAllEvents()
    res.status(200).send({
      events
    })
  })

  // NOTE: experimental code while we learn how to interpret trip data
  function categorizeTrips(perTripId: {
    [s: string]: { provider_id: UUID; trip_id: UUID; eventTypes: { [n: number]: string } }
  }): { [s: string]: TripsStats } {
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

  app.get(pathsFor('/admin/last_day_trips_by_provider'), async (req: DailyApiRequest, res: DailyApiResponse) => {
    async function fail(err: Error | string): Promise<void> {
      await log.error('last_day_trips_by_provider err:', err)
    }

    const { start_time, end_time } = startAndEnd(req.params)
    try {
      const rows = await db.getTripEventsLast24HoursByProvider(start_time, end_time)
      const perTripId = categorizeTrips(
        rows.reduce(
          (
            acc: {
              [s: string]: { provider_id: UUID; trip_id: UUID; eventTypes: { [t: number]: VehicleEvent } }
            },
            row
          ) => {
            const tid = row.trip_id
            acc[tid] = acc[tid] || {
              provider_id: row.provider_id,
              trip_id: tid,
              eventTypes: {}
            }
            acc[tid].eventTypes[row.timestamp] = row.event_type
            return acc
          },
          {}
        )
      )

      const provider_info = Object.keys(perTripId).reduce(
        (map: { [s: string]: TripsStats & { name: string } }, provider_id) => {
          return Object.assign(map, { [provider_id]: { ...perTripId[provider_id], name: providerName(provider_id) } })
        },
        {}
      )
      res.status(200).send(provider_info)
    } catch (err) {
      await fail(err)
    }
  })

  // get raw trip data for analysis
  app.get(pathsFor('/admin/raw_trip_data/:trip_id'), async (req: DailyApiRequest, res: DailyApiResponse) => {
    try {
      const { trip_id } = req.params
      const eventsAndCount: { events: VehicleEvent[]; count: number } = await db.readEvents({ trip_id })
      if (eventsAndCount.events.length > 0) {
        const { events } = eventsAndCount
        events[0].timestamp_long = new Date(events[0].timestamp).toString()
        for (let i = 1; i < events.length; i += 1) {
          events[i].timestamp_long = new Date(events[i].timestamp).toString()
          events[i].delta = events[i].timestamp - events[i - 1].timestamp
        }
        res.status(200).send({ events })
      } else {
        res.status(404).send({ result: 'not_found' })
      }
    } catch (err) {
      await log.error(`raw_trip_data: ${err}`)
      res.status(500).send(SERVER_ERROR)
    }
  })

  // Get a hash set up where the keys are the provider IDs, so it's easier
  // to combine the result of each db query.
  // I could have just used the providers who have vehicles registered, but
  // I didn't want to have to wrap everything in another Promise.then callback
  // by asking the DB for that information.
  // This function is ludicrously long as it is.
  app.get(pathsFor('/admin/last_day_stats_by_provider'), async (req: DailyApiRequest, res: DailyApiResponse) => {
    const provider_info: {
      [p: string]: {
        name: string
        events_last_24h: number
        trips_last_24h: number
        ms_since_last_event: number
        event_counts_last_24h: { [s: string]: number }
        late_event_counts_last_24h: { [s: string]: number }
        telemetry_counts_last_24h: number
        late_telemetry_counts_last_24h: number
        registered_last_24h: number
        events_not_in_conformance: number
      }
    } = {}

    const { start_time, end_time } = startAndEnd(req.params)

    async function fail(err: Error | string): Promise<void> {
      await log.error(
        'last_day_stats_by_provider err:',
        err instanceof Error ? err.message : err,
        err instanceof Error ? err.stack : ''
      )
    }

    const getTripCountsSince = async () => {
      try {
        const rows = await db.getTripCountsPerProviderSince(start_time, end_time)
        await log.info('trips last 24h', rows)
        rows.map(row => {
          const pid = row.provider_id
          provider_info[pid] = provider_info[pid] || {}
          provider_info[pid].trips_last_24h = Number(row.count)
        })
      } catch (err) {
        await fail(err)
      }
    }

    const getTimeSinceLastEvent = async () => {
      try {
        const rows = await db.getMostRecentEventByProvider()
        await log.info('time since last event', rows)
        rows.map(row => {
          const pid = row.provider_id
          provider_info[pid] = provider_info[pid] || {}
          provider_info[pid].ms_since_last_event = now() - row.max
        })
      } catch (err) {
        await fail(err)
      }
    }

    const getEventCountsPerProviderSince = async () => {
      try {
        const rows = await db.getEventCountsPerProviderSince(start_time, end_time)
        await log.info('time since last event', rows)
        rows.map(row => {
          const pid = row.provider_id
          provider_info[pid] = provider_info[pid] || {}
          provider_info[pid].event_counts_last_24h = provider_info[pid].event_counts_last_24h || {}
          provider_info[pid].late_event_counts_last_24h = provider_info[pid].late_event_counts_last_24h || {}
          provider_info[pid].event_counts_last_24h[row.event_type] = row.count
          provider_info[pid].late_event_counts_last_24h[row.event_type] = row.slacount
        })
      } catch (err) {
        await fail(err)
      }
    }

    const getTelemetryCountsPerProviderSince = async () => {
      try {
        const rows = await db.getTelemetryCountsPerProviderSince(start_time, end_time)
        await log.info('time since last event', rows)
        rows.map(row => {
          const pid = row.provider_id
          provider_info[pid] = provider_info[pid] || {}
          provider_info[pid].telemetry_counts_last_24h = row.count
          provider_info[pid].late_telemetry_counts_last_24h = row.slacount
        })
      } catch (err) {
        await fail(err)
      }
    }

    const getNumVehiclesRegisteredLast24Hours = async () => {
      try {
        const rows = await db.getNumVehiclesRegisteredLast24HoursByProvider(start_time, end_time)
        await log.info('num vehicles since last 24', rows)
        rows.map(row => {
          const pid = row.provider_id
          provider_info[pid] = provider_info[pid] || {}
          provider_info[pid].registered_last_24h = row.count
        })
      } catch (err) {
        await fail(err)
      }
    }

    const getNumEventsLast24Hours = async () => {
      try {
        const rows = await db.getNumEventsLast24HoursByProvider(start_time, end_time)
        rows.map(row => {
          const pid = row.provider_id
          provider_info[pid] = provider_info[pid] || {}
          provider_info[pid].events_last_24h = row.count
        })
      } catch (err) {
        await fail(err)
      }
    }

    const getConformanceLast24Hours = async () => {
      try {
        const rows = await db.getEventsLast24HoursPerProvider(start_time, end_time)
        const prev_event: { [key: string]: VehicleEvent } = {}
        await log.info('event', rows)
        rows.map(event => {
          const pid = event.provider_id
          provider_info[pid] = provider_info[pid] || {}
          provider_info[pid].events_not_in_conformance = provider_info[pid].events_not_in_conformance || 0
          if (prev_event[event.device_id]) {
            provider_info[pid].events_not_in_conformance += isStateTransitionValid(prev_event[event.device_id], event)
              ? 0
              : 1
          }
          prev_event[event.device_id] = event
        })
      } catch (err) {
        await fail(err)
      }
    }

    try {
      await Promise.all([
        getTimeSinceLastEvent(),
        getNumVehiclesRegisteredLast24Hours(),
        getNumEventsLast24Hours(),
        getTripCountsSince(),
        getEventCountsPerProviderSince(),
        getTelemetryCountsPerProviderSince(),
        getConformanceLast24Hours()
      ])

      Object.keys(provider_info).map(provider_id => {
        provider_info[provider_id].name = providerName(provider_id)
      })
      res.status(200).send(provider_info)
    } catch (err) {
      await log.error('unable to fetch data from last 24 hours', err)
      res.status(500).send(new ServerError())
    }
  })

  return app

  // /////////////////// end Agency candidate endpoints ////////////////////
}

// ///////////////////// end test-only endpoints ///////////////////////

export { api }
