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
import providers from 'mds-providers' // map of uuids -> obj

import { makeTelemetry, makeEvents, makeDevices } from 'mds-test-data'
import { VEHICLE_EVENTS, VEHICLE_TYPE, PROPULSION_TYPE } from 'mds-enums'
import { isUUID, now, round, seconds, pathsFor } from 'mds-utils'
import { Device, UUID, VehicleEvent, Telemetry, Provider } from 'mds'
import { FeatureCollection, Feature } from 'geojson'
import {
  ReadTripsBlob,
  ReadTripIdsBlob,
  Trip,
  ReadEventsResult,
  ReadStatusChangesResult,
  StatusChange
} from 'mds-db/types'
import { asJsonApiLinks, asPagingParams } from 'mds-api-helpers'
import { ProviderApiRequest, PageParams } from './types'
import { asStatusChangeEvent } from './utils'

log.startup()

function api(app: express.Express): express.Express {
  // /////////// enums ////////////////

  const PROVIDER_VERSION = '0.3.1'

  // / ////////// utilities ////////////////

  function getAuth(req: ProviderApiRequest): Partial<{ provider_id: string; scope: string }> {
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

  /**
   * convert provider_id to provider name (if available)
   * @param  {UUID} provider_id
   * @return {String} name or provider_id
   */
  // FIXME de-dup
  function providerName(provider_id: string | undefined): string {
    if (provider_id) {
      return providers[provider_id] ? providers[provider_id].provider_name : provider_id
    }
    return 'none'
  }

  /**
   * Provider-specific middleware to extract provider_id into locals, do some logging, etc.
   */
  app.use((req, res, next) => {
    try {
      if (req.path.includes('/health')) {
        // all auth provided by API Gateway
      } else if (req.path !== '/') {
        // verify presence of provider_id
        const { provider_id, scope } = getAuth(req)

        // no test access without auth
        if (req.path.includes('/test/') && !(scope || '').includes('test:all')) {
          /* istanbul ignore next */
          return res.status(403).send({
            result: 'no test access'
          })
        }

        /* istanbul ignore else getAuth will never return an invalid provider_id */
        if (!provider_id) {
          log.warn('Missing provider_id in', req.originalUrl)
          return res.status(403).send({
            error: 'missing_provider_id'
          })
        }
        /* istanbul ignore next */
        if (!isUUID(provider_id)) {
          log.warn(req.originalUrl, 'bogus provider_id', provider_id)
          return res.status(403).send({
            error: 'invalid_provider_id',
            error_description: `invalid provider_id ${provider_id} is not a UUID`
          })
        }
        // stash provider_id
        res.locals.provider_id = provider_id

        // helpy logging
        log.info(providerName(provider_id), req.method, req.originalUrl)
      }
    } catch (err) {
      log.error(req.originalUrl, 'request validation fail:', err.stack)
    }
    next()
  })

  // / //////////////////////// basic gets /////////////////////////////////

  app.get(pathsFor('/test/initialize'), (req, res) => {
    log.info('get /test/initialize')

    // nuke it all
    Promise.all([cache.initialize(), db.initialize()]).then(() => {
      log.info('got /test/initialize')
      res.status(201).send({
        result: 'Initialized'
      })
    })
  })

  // get => random data
  app.get(pathsFor('/test/seed'), (req, res) => {
    // create seed data
    try {
      log.info('/test/seed', JSON.stringify(req.query))
      const { n, num } = req.query

      const count = parseInt(n) || parseInt(num) || 10000
      const timestamp = now()
      const devices = makeDevices(count, timestamp)
      const events = makeEvents(devices, timestamp)
      const telemetry = makeTelemetry(devices, timestamp)

      // FIXME events

      const data = {
        devices,
        events,
        telemetry
      }

      Promise.all([cache.seed(data), db.seed(data)]).then(
        () => {
          log.info('/test/seed success')
          res.status(201).send({
            result: `Seeded ${count} devices/events/telemetry`
          })
        },
        err => /* istanbul ignore next */ {
          log.error('/test/seed failure:', err)
          res.status(500).send({
            result: `Failed to seed: ${err}`
          })
        }
      )
    } catch (err) /* istanbul ignore next */ {
      log.error('/test/seed failure:', err.stack)
      res.status(500).send({
        result: `Failed to seed: ${err.stack}`
      })
    }
  })

  // post => populate from body
  app.post(pathsFor('/test/seed'), (req, res) => {
    // create seed data
    try {
      Promise.all([cache.seed(req.body), db.seed(req.body)]).then(
        () => {
          log.info('/test/seed success')
          res.status(201).send({
            result: `Seeded devices/events/telemetry`
          })
        },
        err => /* istanbul ignore next */ {
          log.error('/test/seed failure:', err)
          res.status(500).send({
            result: `Failed to seed: ${err}`
          })
        }
      )
    } catch (err) /* istanbul ignore next */ {
      log.error('/test/seed failure:', err.stack)
      res.status(500).send({
        result: `Failed to seed: ${err.stack}`
      })
    }
  })

  app.get(pathsFor('/test/shutdown'), (req, res) => {
    Promise.all([db.shutdown(), cache.shutdown()]).then(() => {
      res.send({
        result: 'shutdown done'
      })
    })
  })

  app.get(pathsFor('/test/update_device'), (req, res) => {
    cache.updateVehicleList(req.query.device_id, req.query.timestamp).then((total: number) => {
      res.send({
        result: 'Done',
        total
      })
    })
  })

  app.get(pathsFor('/health'), (req, res) => {
    // FIXME add real health checks
    // verify access to known resources e.g. redis, postgres
    res.status(200).send({
      result: 'we good'
    })
  })

  // / /////////////////////// trips /////////////////////////////////

  /**
   * Read Device from cache if possible, else fall through to db
   * @param  {device_id}
   * @return {Device}
   */
  async function getDevice(device_id: UUID): Promise<Device> {
    // FIXME get device from cache, and if not cache, db
    // let device = await cache.readDevice(device_id)
    // if (!device) {
    const device = await db.readDevice(device_id)
    // }
    return device
  }

  async function getProvider(provider_id: UUID): Promise<Provider> {
    return Promise.resolve(
      providers[provider_id] || {
        provider_name: 'unknown'
      }
    )
  }

  /**
   * Convert a Telemetry object into a GeoJSON Feature
   * @param item a Telemetry object
   * @returns a GeoJSON feature
   */
  function asFeature(item: Telemetry): Feature {
    return {
      type: 'Feature',
      properties: {
        timestamp: item.timestamp
      },
      geometry: {
        type: 'Point',
        coordinates: [round(item.gps.lng, 6), round(item.gps.lat, 6)]
      }
    }
  }

  /**
   * Convert a list of Telemetry points into a FeatureCollection
   * @param  {items list of Telemetry elements}
   * @return {GeoJSON FeatureCollection}
   */
  function asFeatureCollection(items: Telemetry[]): FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: items.map((item: Telemetry) => asFeature(item))
    }
  }

  /**
   * Generate a GeoJSON Route from a trip_start and trip_end Event
   * @param  {trip_start Event}
   * @param  {trip_end Event}
   * @return {Trip object}
   */
  async function asRoute(trip_start: VehicleEvent, trip_end: VehicleEvent): Promise<FeatureCollection> {
    log.info('asRoute', JSON.stringify(trip_start), JSON.stringify(trip_end))
    const telemetry: Telemetry[] = await db.readTelemetry(
      trip_start.device_id,
      trip_start.timestamp,
      trip_end.timestamp
    )
    log.info('asRoute telemetry', JSON.stringify(telemetry))
    return Promise.resolve(asFeatureCollection(telemetry))
  }

  /**
   * Generate a Trip from a trip_start and trip_end Event
   * @param  {trip_start VehicleEvent}
   * @param  {trip_end VehicleEvent}
   * @return {Trip object}
   */
  async function asTrip(
    trip_start: VehicleEvent & { trip_id: UUID },
    trip_end: VehicleEvent & { trip_id: UUID }
  ): Promise<Trip> {
    const device = await getDevice(trip_start.device_id || trip_end.device_id)
    const provider = await getProvider(device.provider_id)
    const route = await asRoute(trip_start, trip_end)
    return Promise.resolve({
      provider_id: device.provider_id,
      provider_name: provider.provider_name,
      device_id: device.device_id,
      vehicle_id: device.vehicle_id,
      vehicle_type: device.type as VEHICLE_TYPE,
      propulsion_type: device.propulsion as PROPULSION_TYPE[],
      provider_trip_id: trip_start.trip_id,
      trip_duration: trip_end.timestamp - trip_start.timestamp,
      trip_distance: 0, // FIXME
      route,
      accuracy: 1, // FIXME
      trip_start: trip_start.timestamp,
      trip_end: trip_end.timestamp,
      parking_verification_url: 'unknown', // FIXME
      standard_cost: 0, // FIXME
      actual_cost: 0, // FIXME
      recorded: now()
    })
  }

  /**
   * Convert trip Events into
   * @param  {list of Events that have a non-null trip_id}
   * @return {list of Trips}
   */
  async function asTrips(trip_ids: UUID[]): Promise<Trip[]> {
    log.info('asTrips', trip_ids.length, 'trip_ids', trip_ids)
    const promises = trip_ids.reduce((acc: Promise<Trip>[], trip_id): Promise<Trip>[] => {
      // get all trip events
      // log.info('getting events for trip_id', trip_id)
      db.readEvents({
        trip_id
      }).then((blob: ReadEventsResult) => {
        // const { events, count } = blob
        const { events } = blob
        const trip_start = events.find(e => e.event_type === VEHICLE_EVENTS.trip_start)
        const trip_end = events.find(e => e.event_type === VEHICLE_EVENTS.trip_end)
        if (trip_start && trip_end && trip_start.trip_id && trip_end.trip_id) {
          acc.push(asTrip(trip_start as VehicleEvent & { trip_id: UUID }, trip_end as VehicleEvent & { trip_id: UUID }))
        }
      })
      return acc
    }, [])
    return Promise.all(promises)
  }

  // FIXME add pagination?
  app.get(pathsFor('/trips'), (req, res) => {
    const { provider_id } = getAuth(req)
    log.warn(providerName(provider_id), '/trips', JSON.stringify(req.params))

    const { skip, take } = asPagingParams(req.query)
    const { start_time, end_time, device_id, newSkool } = req.query

    // FIXME validate start_time, end_time, etc.

    if (device_id && !isUUID(device_id)) {
      return res.status(400).send({
        result: `invalid device_id ${device_id} is not a UUID`
      })
    }

    const params = {
      skip,
      take,
      start_time,
      end_time,
      device_id,
      event_types: [VEHICLE_EVENTS.trip_start, VEHICLE_EVENTS.trip_end]
    }

    /* istanbul ignore next */
    function fail(err: Error): void {
      log.error('/trips failure', err.stack || err).then(() => {
        res.status(500).send({
          error: 'internal_failure',
          error_description: `trips error: ${err.stack}`
        })
      })
    }

    if (newSkool) {
      db.readTrips(params).then((blob: ReadTripsBlob) => {
        const { trips, count } = blob
        log.info('read', trips.length, 'trips of', count, 'in', blob)
        res.status(200).send({
          version: PROVIDER_VERSION,
          data: {
            trips
          },
          links: asJsonApiLinks(req, skip, take, count)
        })
      })
    } else {
      // retrieve trip events
      db.readTripIds(params)
        .then((blob: ReadTripIdsBlob) => {
          const { tripIds, count } = blob

          log.info('read', tripIds.length, 'trips of', count, 'in', blob)
          asTrips(tripIds)
            .then(trips => {
              res.status(200).send({
                version: PROVIDER_VERSION,
                data: {
                  trips
                },
                links: asJsonApiLinks(req, skip, take, count)
              })
            }, fail)
            .catch(fail)
        }, fail)
        .catch(fail)
    }
  })

  // / ////////////////////////////// status_changes /////////////////////////////

  /**
   * Convert a telemetry object to a GeoJSON Point
   * @param  {Telemetry}
   * @return {GeoJSON Point feature}
   */
  function asPoint(telemetry: Telemetry): Feature | null {
    if (!telemetry) {
      return null
    }
    return {
      type: 'Feature',
      properties: {
        timestamp: telemetry.timestamp
      },
      geometry: {
        type: 'Point',
        coordinates: [round(telemetry.gps.lng, 6), round(telemetry.gps.lat, 6)]
      }
    }
  }

  /**
   * @param  {list of Events}
   * @return {list of StatusChanges}
   */
  async function asStatusChange(event: VehicleEvent): Promise<StatusChange> {
    const telemetry_timestamp = event.telemetry_timestamp || event.timestamp
    const [device, provider, telemetry] = await Promise.all([
      getDevice(event.device_id),
      getProvider(event.provider_id),
      db.readTelemetry(event.device_id, telemetry_timestamp, telemetry_timestamp)
    ])
    const event2 = asStatusChangeEvent(event)
    if (!event2.event_type_reason) {
      throw new Error(
        `invalid empty provider event_type_reason for agency event ${event.event_type}/${event.event_type_reason}` +
          `and provider event_type ${event2.event_type}`
      )
    }
    const hasTelemetry: boolean = telemetry.length > 0
    return {
      provider_id: device.provider_id, // FIXME
      provider_name: provider.provider_name,
      device_id: event.device_id,
      vehicle_id: device.vehicle_id,
      vehicle_type: device.type as VEHICLE_TYPE,
      propulsion_type: device.propulsion as PROPULSION_TYPE[],
      event_type: event2.event_type,
      event_type_reason: event2.event_type_reason,
      event_time: event.timestamp,
      event_location: hasTelemetry ? asPoint(telemetry[0]) : null,
      battery_pct: hasTelemetry ? telemetry[0].charge || null : null,
      associated_trip: event.trip_id || null,
      recorded: event.recorded
    }
  }

  async function asStatusChanges(events: VehicleEvent[]): Promise<StatusChange[]> {
    const result = await Promise.all(events.map(event => asStatusChange(event)))
    return result
  }

  async function getStatusChanges(req: express.Request, res: express.Response) {
    // Standard Provider parameters
    const { start_time, end_time } = req.query

    // Extensions to override paging
    const { skip, take } = asPagingParams(req.query)

    const { provider_id } = getAuth(req)

    try {
      const { count, status_changes }: ReadStatusChangesResult = await db.readStatusChanges({
        provider_id,
        start_time,
        end_time,
        skip,
        take
      })

      res.status(200).send({
        version: PROVIDER_VERSION,
        data: {
          status_changes
        },
        links: asJsonApiLinks(req, skip, take, count)
      })
    } catch (err) {
      // 500 Internal Server Error
      await log.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
      res.status(500).send({ error: new Error(err) })
    }
  }

  async function getEventsAsStatusChanges(req: express.Request, res: express.Response) {
    const { provider_id } = getAuth(req)

    const { start_time, end_time, start_recorded, end_recorded, device_id } = req.query
    const { skip, take } = asPagingParams(req.query)
    const providerAlias = providerName(provider_id)
    const stringifiedQuery = JSON.stringify(req.query)

    // FIXME also validate start_time, end_time

    function fail(err: Error | string): void {
      const msg = err instanceof Error ? err.stack : err
      log.error(providerAlias, '/status_changes', stringifiedQuery, 'failed', msg)

      if (err instanceof Error && err.message.includes('invalid device_id')) {
        res.status(400).send({
          error: 'invalid',
          error_description: 'invalid device_id'
        })
      } else {
        /* istanbul ignore next no good way to fake server failure right now */
        res.status(500).send({
          error: 'server_failure',
          error_description: `status_changes internal error: ${msg}`
        })
      }
    }

    if (device_id !== undefined && !isUUID(device_id)) {
      fail(new Error(`invalid device_id ${device_id}`))
    } else {
      const params = {
        skip,
        take,
        start_time,
        end_time,
        start_recorded,
        end_recorded,
        device_id
      }

      // read events
      // FIXME be mindful about params
      const readEventsStart = now()
      db.readEvents(params)
        .then((blob: ReadEventsResult) => {
          const { events, count } = blob
          const readEventsEnd = now()
          const asStatusChangesStart = now()
          const readEventsDuration = readEventsEnd - readEventsStart
          const readEventsMsg = `${providerAlias} /status_changes ${stringifiedQuery} read ${events.length} of ${count} in ${readEventsDuration} ms`
          if (readEventsDuration < seconds(10)) {
            log.info(readEventsMsg)
          } else {
            log.warn(readEventsMsg)
          }
          // change events into status changes
          asStatusChanges(events)
            .then(status_changes => {
              const asStatusChangesEnd = now()
              const asStatusChangesDuration = asStatusChangesEnd - asStatusChangesStart
              const asStatusChangesMsg = `${providerAlias} /status_changes ${stringifiedQuery} returned ${status_changes.length} in ${asStatusChangesDuration} ms`
              if (asStatusChangesDuration < seconds(10)) {
                log.info(asStatusChangesMsg)
              } else {
                log.warn(asStatusChangesMsg)
              }
              res.status(200).send({
                version: PROVIDER_VERSION,
                data: {
                  status_changes
                },
                links: asJsonApiLinks(req, skip, take, count)
              })
            }, fail)
            .catch(fail)
        }, fail)
        .catch(fail)
    }
  }

  app.get(pathsFor('/status_changes'), async (req, res) => {
    await (req.query.newSkool ? getStatusChanges(req, res) : getEventsAsStatusChanges(req, res))
  })

  // / //////////////////////// devices_status //////////////////////////////////////

  // aggregation background:
  //
  // to get trip/status data from a scooter company, one makes requests from the Provider
  // interface.  this was something of a stop-gap until Agency and other APIs could get built.
  // in the mean-time, tooling companies set up shop on Provider.
  //
  // the above implementation of Provider-on-Agency takes Agency data and transforms it to
  // Provider data structures.  however, this is done on the fly, and not stored.
  //

  // /////////////// update trips/status_changes database from agency data /////////////

  app.get(pathsFor('/admin/import_trips_from_agency'), (req, res) => {
    // TODO implement
    // determine last known timestamp of trips

    /* istanbul ignore next spoofing db failure is not implemented, can't test. */
    function fail(err: Error | string): void {
      const desc = err instanceof Error ? err.message : err
      const stack = err instanceof Error ? err.stack : desc
      log.error(req.path, 'failure', stack).then(() => {
        res.status(500).send({
          error: 'internal_failure',
          error_description: `trips error: ${desc}`
        })
      })
    }

    db.getLatestTripTime()
      .then((timestamp: number) => {
        // do db queries as needed to read trips
        const tripParams = {
          skip: 0,
          take: 100, // FIXME constant
          end_time: timestamp,
          event_types: [VEHICLE_EVENTS.trip_start, VEHICLE_EVENTS.trip_end]
          // ignore device_id
          // igmore start_time
        }
        db.readTripIds(tripParams)
          .then((blob: ReadTripIdsBlob) => {
            const { tripIds, count } = blob
            asTrips(tripIds)
              .then(trips => {
                // write trips
                db.writeTrips(trips)
                // return activity report
                // TODO more trip report?
                res.status(200).send({
                  num_trips: trips.length,
                  remaining: count - trips.length
                })
              }, fail)
              .catch(fail)
          }, fail)
          .catch(fail)
      }, fail)
      .catch(fail)
  })

  app.get(pathsFor('/admin/import_status_changes_from_agency'), (req, res) => {
    /* istanbul ignore next spoofing db failure is not implemented, can't test. */
    function fail(err: Error): void {
      const desc = err.message || err
      const stack = err.stack || desc
      log.error(req.path, 'failure', stack).then(() => {
        res.status(500).send({
          error: 'internal_failure',
          error_description: `trips error: ${desc}`
        })
      })
    }

    db.getLatestStatusChangeTime()
      .then((timestamp: number) => {
        // do db queries as needed to read trips
        const statusChangeParams = {
          skip: 0,
          take: 100, // FIXME constant
          end_time: timestamp
          // ignore device_id
          // igmore start_time
        }
        db.readEvents(statusChangeParams)
          .then((blob: ReadEventsResult) => {
            log.info('/status_changes read', blob)
            const { events, count } = blob
            // change events into status changes
            asStatusChanges(events)
              .then(status_changes => {
                db.writeStatusChanges(status_changes)
                res.status(200).send({
                  num_trips: status_changes.length,
                  remaining: count - status_changes.length
                })
              }, fail)
              .catch(fail)
          }, fail)
          .catch(fail)
      }, fail)
      .catch(fail)
  })

  // /////////////// scrape trips/status_changes from providers, store in db ///////////

  app.get(pathsFor('/admin/import_trips_from_provider'), (req, res) => {
    // TODO implement
    // get provider ID param
    // look up provider URL
    // authenticate against provider
    // fetch trips from provider
    // write trips to db
    // return activity report
    res.status(405).send({
      result: 'umimplemented'
    })
  })

  app.get(pathsFor('/admin/import_status_changes_from_provider'), (req, res) => {
    // TODO implement
    // get provider ID param
    // look up provider URL
    // authenticate against provider
    // fetch status_changes from provider
    // write status_changes to db
    // return activity report
    res.status(405).send({
      result: 'umimplemented'
    })
  })

  return app
}

// Export your Express configuration so that it can be consumed by the Lambda handler
export { api }
export { ProviderApiRequest, Trip, ReadTripIdsBlob, ReadTripsBlob, ReadStatusChangesResult, PageParams }
