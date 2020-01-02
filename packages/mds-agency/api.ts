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
import { isProviderId } from '@mds-core/mds-providers'
import { isUUID, pathsFor } from '@mds-core/mds-utils'
import { AgencyApiRequest, AgencyApiResponse } from '@mds-core/mds-agency/types'
import { checkAccess } from '@mds-core/mds-api-server'
import {
  getAllServiceAreas,
  getServiceAreaById,
  registerVehicle,
  getVehicleById,
  getVehiclesByProvider,
  updateVehicle,
  submitVehicleEvent,
  submitVehicleTelemetry,
  registerStop,
  readStop,
  readStops
} from './request-handlers'
import { readAllVehicleIds } from './agency-candidate-request-handlers'
import { getCacheInfo, wipeDevice, refreshCache } from './sandbox-admin-request-handlers'
import { validateDeviceId } from './utils'

function api(app: express.Express): express.Express {
  /**
   * Agency-specific middleware to extract provider_id into locals, do some logging, etc.
   */
  app.use(async (req: AgencyApiRequest, res: AgencyApiResponse, next) => {
    try {
      // verify presence of provider_id
      if (!(req.path.includes('/health') || req.path === '/')) {
        if (res.locals.claims) {
          const { provider_id } = res.locals.claims

          if (!isUUID(provider_id)) {
            await log.warn(req.originalUrl, 'invalid provider_id is not a UUID', provider_id)
            return res.status(400).send({
              result: `invalid provider_id ${provider_id} is not a UUID`
            })
          }

          if (!isProviderId(provider_id)) {
            return res.status(400).send({
              result: `invalid provider_id ${provider_id} is not a known provider`
            })
          }

          // stash provider_id
          res.locals.provider_id = provider_id

          // log.info(providerName(provider_id), req.method, req.originalUrl)
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

  /**
   * Get all service areas
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#service_areas Service Areas}
   */
  app.get(pathsFor('/service_areas'), getAllServiceAreas)

  /**
   * Get a particular service area
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#service_areas Service Areas}
   */
  app.get(pathsFor('/service_areas/:service_area_id'), getServiceAreaById)

  /**
   * Endpoint to register vehicles
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#vehicle---register Register}
   */
  app.post(pathsFor('/vehicles'), registerVehicle)

  /**
   * Read back a vehicle.
   */
  app.get(pathsFor('/vehicles/:device_id'), validateDeviceId, getVehicleById)

  /**
   * Read back all the vehicles for this provider_id, with pagination
   */
  app.get(pathsFor('/vehicles'), getVehiclesByProvider)

  // update the vehicle_id
  app.put(pathsFor('/vehicles/:device_id'), validateDeviceId, updateVehicle)

  /**
   * Endpoint to submit vehicle events
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#vehicle---event Events}
   */
  app.post(pathsFor('/vehicles/:device_id/event'), validateDeviceId, submitVehicleEvent)

  /**
   * Endpoint to submit telemetry
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#vehicles---update-telemetry Telemetry}
   */
  app.post(pathsFor('/vehicles/telemetry'), submitVehicleTelemetry)

  // ///////////////////// begin Agency candidate endpoints ///////////////////////

  /**
   * Not currently in Agency spec.  Ability to read back all vehicle IDs.
   */
  app.get(
    pathsFor('/admin/vehicle_ids'),
    checkAccess(scopes => scopes.includes('admin:all')),
    readAllVehicleIds
  )

  // /////////////////// end Agency candidate endpoints ////////////////////

  app.get(
    pathsFor('/admin/cache/info'),
    checkAccess(scopes => scopes.includes('admin:all')),
    getCacheInfo
  )

  // wipe a device -- sandbox or admin use only
  app.get(
    pathsFor('/admin/wipe/:device_id'),
    checkAccess(scopes => scopes.includes('admin:all')),
    validateDeviceId,
    wipeDevice
  )

  app.get(
    pathsFor('/admin/cache/refresh'),
    checkAccess(scopes => scopes.includes('admin:all')),
    refreshCache
  )

  app.post(
    pathsFor('/stops'),
    checkAccess(scopes => scopes.includes('admin:all')),
    registerStop
  )

  app.get(pathsFor('/stops/:stop_id'), readStop)

  app.get(pathsFor('/stops'), readStops)

  return app
}

// ///////////////////// end test-only endpoints ///////////////////////

export { api }
