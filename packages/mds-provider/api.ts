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

import logger from '@mds-core/mds-logger'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import { providerName } from '@mds-core/mds-providers' // map of uuids -> obj

import { makeTelemetry, makeEvents, makeDevices } from '@mds-core/mds-test-data'
import { isUUID, now, pathsFor, round, routeDistance } from '@mds-core/mds-utils'
import { Telemetry } from '@mds-core/mds-types'
import { ReadTripsResult, Trip, ReadStatusChangesResult, StatusChange } from '@mds-core/mds-db/types'
import { asJsonApiLinks, asPagingParams } from '@mds-core/mds-api-helpers'
import { Feature, FeatureCollection } from 'geojson'
import { ProviderApiRequest, ProviderApiResponse, PROVIDER_VERSION } from './types'
import { getEventsAsStatusChanges, getEventsAsTrips } from './legacy'

const { PROVIDER_MODERN } = process.env

function api(app: express.Express): express.Express {
  // / ////////// utilities ////////////////

  /**
   * Provider-specific middleware to extract provider_id into locals, do some logging, etc.
   */
  app.use(async (req: ProviderApiRequest, res: ProviderApiResponse, next) => {
    try {
      if (!(req.path.includes('/health') || req.path === '/')) {
        if (res.locals.claims) {
          const { provider_id, scope } = res.locals.claims

          // no test access without auth
          if (req.path.includes('/test/') && !(scope || '').includes('test:all')) {
            /* istanbul ignore next */
            return res.status(403).send({
              result: 'no test access'
            })
          }

          /* istanbul ignore next */
          if (!provider_id) {
            await logger.warn('missing_provider_id', req.originalUrl)
            return res.status(403).send({
              error: 'missing_provider_id'
            })
          }

          /* istanbul ignore next */
          if (!isUUID(provider_id)) {
            await logger.warn('invalid_provider_id is not a UUID', provider_id, req.originalUrl)
            return res.status(403).send({
              error: 'invalid_provider_id',
              error_description: `invalid provider_id ${provider_id} is not a UUID`
            })
          }

          logger.info(providerName(provider_id), req.method, req.originalUrl)
        } else {
          return res.status(401).send('Unauthorized')
        }
      }
    } catch (err) {
      const desc = err instanceof Error ? err.message : err
      const stack = err instanceof Error ? err.stack : desc
      await logger.error(req.originalUrl, 'request validation fail:', desc, stack || JSON.stringify(err))
    }
    next()
  })

  // / //////////////////////// basic gets /////////////////////////////////

  app.get(pathsFor('/test/initialize'), async (req: ProviderApiRequest, res: ProviderApiResponse) => {
    logger.info('get /test/initialize')

    // nuke it all
    await Promise.all([cache.initialize(), db.initialize()])
    logger.info('got /test/initialize')
    res.status(201).send({
      result: 'Initialized'
    })
  })

  // get => random data
  app.get(pathsFor('/test/seed'), async (req: ProviderApiRequest, res: ProviderApiResponse) => {
    // create seed data
    try {
      logger.info('/test/seed', JSON.stringify(req.query))
      const { n, num } = req.query

      const count = parseInt(n) || parseInt(num) || 10000
      const timestamp = now()
      const devices = makeDevices(count, timestamp)
      const events = makeEvents(devices, timestamp)
      const telemetry = makeTelemetry(devices, timestamp)

      const data = {
        devices,
        events,
        telemetry
      }

      await Promise.all([cache.seed(data), db.seed(data)])
      logger.info('/test/seed success')
      res.status(201).send({
        result: `Seeded ${count} devices/events/telemetry`
      })
    } catch (err) /* istanbul ignore next */ {
      const desc = err instanceof Error ? err.message : err
      const stack = err instanceof Error ? err.stack : desc
      await logger.error('/test/seed failure:', desc, stack || JSON.stringify(err))
      res.status(500).send({
        result: `Failed to seed: ${desc}`
      })
    }
  })

  // post => populate from body
  app.post(pathsFor('/test/seed'), async (req: ProviderApiRequest, res: ProviderApiResponse) => {
    // create seed data
    try {
      await Promise.all([cache.seed(req.body), db.seed(req.body)])
      logger.info('/test/seed success')
      res.status(201).send({
        result: `Seeded devices/events/telemetry`
      })
    } catch (err) /* istanbul ignore next */ {
      const desc = err instanceof Error ? err.message : err
      const stack = err instanceof Error ? err.stack : desc
      await logger.error('/test/seed failure:', desc, stack || JSON.stringify(err))
      res.status(500).send({
        result: `Failed to seed: ${desc}`
      })
    }
  })

  app.get(pathsFor('/test/shutdown'), async (req: ProviderApiRequest, res: ProviderApiResponse) => {
    await Promise.all([db.shutdown(), cache.shutdown()])
    res.send({
      result: 'shutdown done'
    })
  })

  // / /////////////////////// trips /////////////////////////////////

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

  const asTrip = async ({
    recorded,
    first_trip_enter,
    last_trip_leave,
    ...trip
  }: Trip): Promise<Omit<Trip, 'recorded'>> => {
    const { trip_start, trip_end } = trip
    if (trip_start && trip_end && trip_end > trip_start) {
      const telemetry = await db.readTelemetry(trip.device_id, trip_start, trip_end)
      return {
        ...trip,
        route: asFeatureCollection(telemetry),
        trip_distance: round(routeDistance(telemetry.map(t => t.gps)), 6),
        trip_duration: trip_end - trip_start
      }
    }
    return trip
  }

  app.get(
    pathsFor('/trips'),
    PROVIDER_MODERN
      ? /* istanbul ignore next */ async (req: ProviderApiRequest, res: ProviderApiResponse) => {
          // Standard Provider parameters
          const { provider_id, device_id, vehicle_id } = req.query
          const min_end_time = req.query.min_end_time && Number(req.query.min_end_time)
          const max_end_time = req.query.max_end_time && Number(req.query.max_end_time)

          // Extensions to override paging
          const { skip, take } = asPagingParams(req.query)

          if (provider_id && !isUUID(provider_id)) {
            return res.status(400).send({
              result: `invalid provider_id ${provider_id} is not a UUID`
            })
          }

          if (device_id && !isUUID(device_id)) {
            return res.status(400).send({
              result: `invalid device_id ${device_id} is not a UUID`
            })
          }

          try {
            const { count, trips }: ReadTripsResult = await db.readTrips({
              provider_id,
              device_id,
              vehicle_id,
              min_end_time,
              max_end_time,
              skip,
              take
            })

            res.status(200).send({
              version: PROVIDER_VERSION,
              data: {
                trips: await Promise.all(trips.map(asTrip))
              },
              links: asJsonApiLinks(req, skip, take, count)
            })
          } catch (err) {
            // 500 Internal Server Error
            const desc = err instanceof Error ? err.message : err
            const stack = err instanceof Error ? err.stack : desc
            await logger.error(`fail ${req.method} ${req.originalUrl}`, desc, stack || JSON.stringify(err))
            res.status(500).send({ error: new Error(desc) })
          }
        }
      : getEventsAsTrips
  )

  // / ////////////////////////////// status_changes /////////////////////////////

  const asStatusChange = ({ recorded, ...props }: StatusChange): Omit<StatusChange, 'recorded'> => props

  app.get(
    pathsFor('/status_changes'),
    PROVIDER_MODERN
      ? /* istanbul ignore next */ async (req: ProviderApiRequest, res: ProviderApiResponse) => {
          // Standard Provider parameters
          const start_time = req.query.start_time && Number(req.query.start_time)
          const end_time = req.query.end_time && Number(req.query.end_time)
          const { device_id, provider_id } = req.query

          // Extensions to override paging
          const { skip, take } = asPagingParams(req.query)

          if (provider_id && !isUUID(provider_id)) {
            return res.status(400).send({
              result: `invalid provider_id ${provider_id} is not a UUID`
            })
          }

          if (device_id && !isUUID(device_id)) {
            return res.status(400).send({
              result: `invalid device_id ${device_id} is not a UUID`
            })
          }

          try {
            const { count, status_changes }: ReadStatusChangesResult = await db.readStatusChanges({
              start_time,
              end_time,
              skip,
              take
            })

            res.status(200).send({
              version: PROVIDER_VERSION,
              data: {
                status_changes: status_changes.map(asStatusChange)
              },
              links: asJsonApiLinks(req, skip, take, count)
            })
          } catch (err) {
            // 500 Internal Server Error
            const desc = err instanceof Error ? err.message : err
            const stack = err instanceof Error ? err.stack : desc
            await logger.error(`fail ${req.method} ${req.originalUrl}`, desc, stack || JSON.stringify(err))
            res.status(500).send({ error: new Error(desc) })
          }
        }
      : getEventsAsStatusChanges
  )

  return app
}

export { api }
