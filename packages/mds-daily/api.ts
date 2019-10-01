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
import cache from '@mds-core/mds-cache'
import { providerName, isProviderId } from '@mds-core/mds-providers'
import { isUUID, pathsFor } from '@mds-core/mds-utils'
import { checkScope } from '@mds-core/mds-api-server'
import { DailyApiRequest, DailyApiResponse } from './types'
import {
  getRawTripData,
  getVehicleCounts,
  getLastDayTripsByProvider,
  getLastDayStatsByProvider
} from './request-handlers'

async function agencyMiddleware(req: DailyApiRequest, res: DailyApiResponse, next: Function) {
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
}

function api(app: express.Express): express.Express {
  /**
   * Agency-specific middleware to extract provider_id into locals, do some logging, etc.
   */
  app.use(agencyMiddleware)

  // / ////////// gets ////////////////

  // ///////////////////// begin daily endpoints ///////////////////////

  app.get(pathsFor('/admin/vehicle_counts'), checkScope(scopes => scopes.includes('admin:all')), getVehicleCounts)

  // read all the latest events out of the cache
  app.get(
    pathsFor('/admin/events'),
    checkScope(scopes => scopes.includes('admin:all')),
    async (req: DailyApiRequest, res: DailyApiResponse) => {
      const events = await cache.readAllEvents()
      res.status(200).send({
        events
      })
    }
  )

  app.get(
    pathsFor('/admin/last_day_trips_by_provider'),
    checkScope(scopes => scopes.includes('admin:all')),
    getLastDayTripsByProvider
  )

  // get raw trip data for analysis
  app.get(pathsFor('/admin/raw_trip_data/:trip_id'), checkScope(scopes => scopes.includes('admin:all')), getRawTripData)

  // Get a hash set up where the keys are the provider IDs, so it's easier
  // to combine the result of each db query.
  // I could have just used the providers who have vehicles registered, but
  // I didn't want to have to wrap everything in another Promise.then callback
  // by asking the DB for that information.
  // This function is ludicrously long as it is.
  app.get(
    pathsFor('/admin/last_day_stats_by_provider'),
    checkScope(scopes => scopes.includes('admin:all')),
    getLastDayStatsByProvider
  )

  return app

  // /////////////////// end Agency candidate endpoints ////////////////////
}

// ///////////////////// end test-only endpoints ///////////////////////

export { agencyMiddleware, api }
