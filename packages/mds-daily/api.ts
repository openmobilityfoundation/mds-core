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
import jwtDecode from 'jwt-decode'

import log from 'mds-logger'
import db from 'mds-db'
import cache from 'mds-cache'
import stream from 'mds-stream'
import { providers, providerName } from 'mds-providers'
import areas from 'ladot-service-areas'
import { UUID, VehicleEvent, Telemetry, CountMap, DeviceID } from 'mds'
import { VEHICLE_EVENTS, VEHICLE_STATUSES, EVENT_STATUS_MAP } from 'mds-enums' // FIXME replace eventually
import { isUUID, isTimestamp, now, days, inc, pathsFor, head, tail, isStateTransitionValid } from 'mds-utils'
import { TripsStats, AgencyApiRequest } from 'mds-agency/types'

const SERVER_ERROR = {
  error: 'server_error',
  error_description: 'an internal server error has occurred and been logged'
}

log.startup()

// / ////////// utilities ////////////////

/**
 * Extract auth info from JWT or auth headers
 */

function getAuth(req: AgencyApiRequest): Partial<{ provider_id: string; scope: string }> {
  // Handle Auth from API Gateway
  const authorizer =
    req.apiGateway &&
    req.apiGateway.event &&
    req.apiGateway.event.requestContext &&
    req.apiGateway.event.requestContext.authorizer

  /* istanbul ignore next */
  if (authorizer) {
    const { provider_id, scope } = authorizer
    return { provider_id, scope }
  }

  // Handle Authorization Header when running standalone
  const decode = ([scheme, token]: string[]): Partial<{ provider_id: string; scope: string }> => {
    const decoders: { [scheme: string]: () => Partial<{ provider_id: string; scope: string }> } = {
      bearer: () => {
        const decoded: { [key: string]: string } = jwtDecode(token)
        return {
          provider_id: decoded['https://ladot.io/provider_id'],
          scope: decoded.scope
        }
      },
      basic: () => {
        const [provider_id, scope] = Buffer.from(token, 'base64')
          .toString()
          .split('|')
        return { provider_id, scope }
      }
    }
    const decoder = decoders[scheme.toLowerCase()]
    return decoder ? decoder() : {}
  }

  return req.headers.authorization ? decode(req.headers.authorization.split(' ')) : {}
}

function api(app: express.Express): express.Express {
  /**
   * Agency-specific middleware to extract provider_id into locals, do some logging, etc.
   */
  app.use((req, res, next) => {
    try {
      // verify presence of provider_id
      if (req.path.includes('/health')) {
        // all auth provided by API Gateway
      } else if (req.path !== '/') {
        const { provider_id, scope } = getAuth(req)

        // no test access without auth
        if (req.path.includes('/test/')) {
          if (!scope || !scope.includes('test:all')) {
            return res.status(403).send({
              result: `no test access without test:all scope (${scope})`
            })
          }
        }

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
            log.warn(req.originalUrl, 'bogus provider_id', provider_id)
            return res.status(400).send({
              result: `invalid provider_id ${provider_id} is not a UUID`
            })
          }
          if (!providers[provider_id]) {
            res.status(400).send({
              result: `invalid provider_id ${provider_id} is not a known provider`
            })
          }
        }

        // stash provider_id
        res.locals.provider_id = provider_id

        // helpy logging
        // log.info(providerName(provider_id), req.method, req.originalUrl)
      }
    } catch (err) {
      /* istanbul ignore next */
      log.error(req.originalUrl, 'request validation fail:', err.stack)
    }
    next()
  })

  // / ////////// gets ////////////////

  // ///////////////////// begin daily endpoints ///////////////////////

  app.get(pathsFor('/test/shutdown'), (req, res) => {
    Promise.all([cache.shutdown(), stream.shutdown(), db.shutdown()]).then(() => {
      log.info('shutdown complete (in theory)')
      res.send({
        result: 'cache/stream/db shutdown done'
      })
    })
  })

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

  app.get(pathsFor('/admin/vehicle_counts'), (req, res) => {
    function fail(err: Error | string): void {
      log.error('/admin/vehicle_counts fail', err).then(() => {
        res.status(500).send({
          error: err
        })
      })
    }

    async function getMaps(): Promise<{
      eventMap: { [s: string]: VehicleEvent }
      telemetryMap: { [s: string]: Telemetry }
    }> {
      /* eslint-disable no-param-reassign */
      const telemetry: Telemetry[] = await cache.readAllTelemetry()
      const events: VehicleEvent[] = await cache.readAllEvents()
      const eventSeed: { [s: string]: VehicleEvent } = {}
      const eventMap: { [s: string]: VehicleEvent } = events.reduce((map, event) => {
        map[event.device_id] = event
        return map
      }, eventSeed)
      const telemetrySeed: { [s: string]: Telemetry } = {}
      const telemetryMap = telemetry.reduce((map, t) => {
        map[t.device_id] = t
        return map
      }, telemetrySeed)
      /* eslint-enable no-param-reassign */
      return Promise.resolve({
        telemetryMap,
        eventMap
      })
    }

    db.getVehicleCountsPerProvider().then((rows: { provider_id: UUID; count: string }[]) => {
      const stats: {
        provider_id: UUID
        provider: string
        count: number
        status: { [s: string]: number }
        event_type: { [s: string]: number }
        areas: { [s: string]: number }
      }[] = rows.map(row => {
        const { provider_id } = row
        const count = parseInt(row.count)
        return {
          provider_id,
          provider: providerName(provider_id),
          count,
          status: {},
          event_type: {},
          areas: {}
        }
      })
      log.warn('/admin/vehicle_counts', JSON.stringify(stats))

      getMaps()
        .then((maps: { eventMap: { [s: string]: VehicleEvent }; telemetryMap: { [s: string]: Telemetry } }) => {
          // TODO reimplement to be more efficient
          const { eventMap } = maps
          Promise.all(
            stats.map(stat => {
              /* eslint-disable no-param-reassign */
              stat.event_type = {}
              stat.status = {}
              stat.areas = {}
              /* eslint-enable no-param-reassign */
              return db.readDeviceIds(stat.provider_id).then((items: DeviceID[]) => {
                items.map(item => {
                  const event = eventMap[item.device_id]
                  // const tel = telemetryMap[item.device_id]
                  const event_type = event ? event.event_type : 'default'
                  inc(stat.event_type, event_type)
                  const status = EVENT_STATUS_MAP[event_type]
                  inc(stat.status, status)
                  // FIXME latest-state should remove service_area_id if it's null
                  if (event && RIGHT_OF_WAY_STATUSES.includes(status) && event.service_area_id) {
                    const serviceArea = areas.serviceAreaMap[event.service_area_id]
                    if (serviceArea) {
                      inc(stat.areas, serviceArea.description)
                    }
                  }
                })
              })
            })
          )
            .then(() => {
              res.status(200).send(stats)
            }, fail)
            .catch(fail)
        }, fail)
        .catch(fail)
    })
  })

  // read all the latest events out of the cache
  app.get(pathsFor('/admin/events'), (req, res) => {
    cache.readAllEvents().then((events: VehicleEvent[]) => {
      res.status(200).send({
        events
      })
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
      const counts: CountMap<{}> = {}
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

  app.get(pathsFor('/admin/last_day_trips_by_provider'), (req, res) => {
    function fail(err: Error | string): void {
      log.error('last_day_trips_by_provider err:', err)
    }

    const { start_time, end_time } = startAndEnd(req.params)

    const getTripEventsLast24HoursByProvider = new Promise(resolve => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      db.getTripEventsLast24HoursByProvider(start_time, end_time).then((rows: any) => {
        const perTripId: { [s: string]: { provider_id: UUID; trip_id: UUID; eventTypes: { [t: number]: string } } } = {}
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        rows.map((row: any) => {
          const tid = row.trip_id
          perTripId[tid] = perTripId[tid] || {
            provider_id: row.provider_id,
            trip_id: tid,
            eventTypes: {}
          }
          perTripId[tid].eventTypes[parseInt(row.timestamp)] = row.event_type
        })
        // log.warn(JSON.stringify(perTripId))
        resolve(categorizeTrips(perTripId))
      })
    })

    Promise.all([getTripEventsLast24HoursByProvider])
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      .then((rowsOfValues: any[]) => {
        const provider_info: { [s: string]: { name: string } } = rowsOfValues[0]
        Object.keys(provider_info).map(provider_id => {
          provider_info[provider_id].name = providerName(provider_id)
        })
        res.status(200).send(provider_info)
      }, fail)
      .catch((err: Error) => {
        log.error('unable to fetch data from last 24 hours', err).then(() => {
          res.status(500).send(SERVER_ERROR)
        })
      })
  })

  // get raw trip data for analysis
  app.get(pathsFor('/admin/raw_trip_data/:trip_id'), (req, res) => {
    const { trip_id } = req.params
    db.readEvents({ trip_id })
      .then(
        (eventsAndCount: { events: VehicleEvent[]; count: number }) => {
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
        },
        (err: Error) => /* istanbul ignore next */ {
          log.error(`raw_trip_data: ${err}`)
          res.status(500).send(SERVER_ERROR)
        }
      )
      .catch((ex: Error) => /* istanbul ignore next */ {
        log.error(`raw_trip_data: ${ex.stack}`)
        res.status(500).send(SERVER_ERROR)
      })
  })

  // Get a hash set up where the keys are the provider IDs, so it's easier
  // to combine the result of each db query.
  // I could have just used the providers who have vehicles registered, but
  // I didn't want to have to wrap everything in another Promise.then callback
  // by asking the DB for that information.
  // This function is ludicrously long as it is.
  app.get(pathsFor('/admin/last_day_stats_by_provider'), (req, res) => {
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

    function fail(err: Error | string): void {
      log.error(
        'last_day_stats_by_provider err:',
        err instanceof Error ? err.message : err,
        err instanceof Error ? err.stack : ''
      )
    }

    const getTripCountsSince = new Promise(resolve => {
      db.getTripCountsPerProviderSince(start_time, end_time)
        .then((rows: { provider_id: string; count: number }[]) => {
          log.info('trips last 24h', rows)
          rows.map(row => {
            const pid = row.provider_id
            provider_info[pid] = provider_info[pid] || {}
            provider_info[pid].trips_last_24h = row.count
          })
          resolve()
        }, fail)
        .catch(fail)
    }).catch(fail)

    const getTimeSinceLastEvent = new Promise(resolve => {
      db.getMostRecentEventByProvider()
        .then((rows: { provider_id: string; max: number }[]) => {
          log.info('time since last event', rows)
          rows.map(row => {
            const pid = row.provider_id
            provider_info[pid] = provider_info[pid] || {}
            provider_info[pid].ms_since_last_event = now() - row.max
          })
          resolve()
        })
        .catch(fail)
    }).catch(fail)

    const getEventCountsPerProviderSince = new Promise(resolve => {
      db.getEventCountsPerProviderSince(start_time, end_time)
        .then((rows: { provider_id: string; event_type: string; count: number; slacount: number }[]) => {
          log.info('time since last event', rows)
          rows.map(row => {
            const pid = row.provider_id
            provider_info[pid] = provider_info[pid] || {}
            provider_info[pid].event_counts_last_24h = provider_info[pid].event_counts_last_24h || {}
            provider_info[pid].late_event_counts_last_24h = provider_info[pid].late_event_counts_last_24h || {}
            provider_info[pid].event_counts_last_24h[row.event_type] = row.count
            provider_info[pid].late_event_counts_last_24h[row.event_type] = row.slacount
          })
          resolve()
        })
        .catch(fail)
    }).catch(fail)

    const getTelemetryCountsPerProviderSince = new Promise(resolve => {
      db.getTelemetryCountsPerProviderSince(start_time, end_time)
        .then((rows: { provider_id: UUID; count: string; slacount: string }[]) => {
          log.info('time since last event', rows)
          rows.map(row => {
            const pid = row.provider_id
            provider_info[pid] = provider_info[pid] || {}
            provider_info[pid].telemetry_counts_last_24h = parseInt(row.count)
            provider_info[pid].late_telemetry_counts_last_24h = parseInt(row.slacount)
          })
          resolve()
        })
        .catch(fail)
    }).catch(fail)

    const getNumVehiclesRegisteredLast24Hours = new Promise(resolve => {
      db.getNumVehiclesRegisteredLast24HoursByProvider(start_time, end_time)
        .then((rows: { provider_id: UUID; count: string }[]) => {
          log.info('num vehicles since last 24', rows)
          rows.map(row => {
            const pid = row.provider_id
            provider_info[pid] = provider_info[pid] || {}
            provider_info[pid].registered_last_24h = parseInt(row.count)
          })
          resolve()
        }, fail)
        .catch(fail)
    }).catch(fail)

    const getNumEventsLast24Hours = new Promise<void>(resolve => {
      db.getNumEventsLast24HoursByProvider(start_time, end_time)
        .then((rows: { provider_id: UUID; count: string }[]) => {
          rows.map(row => {
            const pid = row.provider_id
            provider_info[pid] = provider_info[pid] || {}
            provider_info[pid].events_last_24h = parseInt(row.count)
          })
          resolve()
        }, fail)
        .catch(fail)
    }).catch(fail)

    const getConformanceLast24Hours = new Promise(resolve => {
      db.getEventsLast24HoursPerProvider(start_time, end_time)
        .then((rows: VehicleEvent[]) => {
          const prev_event: { [key: string]: VehicleEvent } = {}
          log.info('event', rows)
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
          resolve()
        })
        .catch(fail)
    }).catch(fail)
    /* getTimeSinceLastTelemetry, getNumTelemetryLast24Hours */

    Promise.all([
      getTimeSinceLastEvent,
      getNumVehiclesRegisteredLast24Hours,
      getNumEventsLast24Hours,
      getTripCountsSince,
      getEventCountsPerProviderSince,
      getTelemetryCountsPerProviderSince,
      getConformanceLast24Hours
    ])
      .then(() => {
        Object.keys(provider_info).map(provider_id => {
          provider_info[provider_id].name = providerName(provider_id)
        })
        res.status(200).send(provider_info)
      }, fail)
      .catch((ex: Error /* istanbul ignore next */) => {
        log.error('unable to fetch data from last 24 hours', ex).then(() => {
          res.status(500).send(SERVER_ERROR)
        })
      })
  })

  app.get(pathsFor('/health'), (req, res) => {
    const health_info: { db?: object; stream?: object } = {}
    db.health()
      .then((result: object) => {
        health_info.db = result

        stream
          .health()
          .then((result2: object) => {
            health_info.stream = result2
            res.status(200).send(health_info)
          })
          .catch((ex: Error /* istanbul ignore next */) => {
            log.info('stream unreachable')
            log.info(ex)
            res.status(200).send({
              result: 'app is up, stream is unreachable'
            })
          })
      })
      .catch((ex: Error /* istanbul ignore next */) => {
        log.info('db unreachable')
        log.info(ex)
        res.status(500).send({
          result: 'app is up, db is unreachable'
        })
      })
  })

  return app

  // /////////////////// end Agency candidate endpoints ////////////////////
}

// ///////////////////// end test-only endpoints ///////////////////////

// Export your Express configuration so that it can be consumed by the Lambda handler
export { api }
