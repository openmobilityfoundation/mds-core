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

import express from 'express'

import logger from '@mds-core/mds-logger'
import { isUUID, pathPrefix } from '@mds-core/mds-utils'
import { checkAccess, AccessTokenScopeValidator } from '@mds-core/mds-api-server'
import { AgencyApiRequest, AgencyApiResponse, AgencyApiAccessTokenScopes } from './types'
import {
  registerVehicle,
  getVehicleById,
  getVehiclesByProvider,
  updateVehicle,
  submitVehicleEvent,
  submitVehicleTelemetry,
  writeTripMetadata
} from './request-handlers'
import { readAllVehicleIds } from './agency-candidate-request-handlers'
import { getCacheInfo, wipeDevice, refreshCache } from './sandbox-admin-request-handlers'
import { validateDeviceId } from './utils'

import { AgencyApiVersionMiddleware } from './middleware/agency-api-version'

const checkAgencyApiAccess = (validator: AccessTokenScopeValidator<AgencyApiAccessTokenScopes>) =>
  checkAccess(validator)

function api(app: express.Express): express.Express {
  /**
   * Agency-specific middleware to extract provider_id into locals, do some logging, etc.
   */
  app.use(AgencyApiVersionMiddleware)

  app.use(async (req: AgencyApiRequest, res: AgencyApiResponse, next) => {
    try {
      // verify presence of provider_id
      if (!req.path.includes('/health')) {
        if (res.locals.claims) {
          const { provider_id } = res.locals.claims

          if (!isUUID(provider_id)) {
            logger.warn('invalid provider_id is not a UUID', { provider_id, originalUrl: req.originalUrl })
            return res.status(400).send({
              error: 'authentication_error',
              error_description: `invalid provider_id ${provider_id} is not a UUID`
            })
          }

          // stash provider_id
          res.locals.provider_id = provider_id

          // logger.info(providerName(provider_id), req.method, req.originalUrl)
        } else {
          return res.status(401).send({ error: 'authentication_error', error_description: 'Unauthorized' })
        }
      }
    } catch (error) {
      /* istanbul ignore next */
      logger.error('request validation fail:', { originalUrl: req.originalUrl, error })
    }
    next()
  })

  // / ////////// gets ////////////////

  /**
   * Endpoint to register vehicles
   * See {@link https://github.com/openmobilityfoundation/mobility-data-specification/tree/dev/agency#vehicle---register Register}
   */
  app.post(pathPrefix('/vehicles'), registerVehicle)

  /**
   * Read back a vehicle.
   */
  app.get(pathPrefix('/vehicles/:device_id'), validateDeviceId, getVehicleById)

  /**
   * Read back all the vehicles for this provider_id, with pagination
   */
  app.get(pathPrefix('/vehicles'), getVehiclesByProvider)

  // update the vehicle_id
  app.put(pathPrefix('/vehicles/:device_id'), validateDeviceId, updateVehicle)

  /**
   * Endpoint to submit vehicle events
   * See {@link https://github.com/openmobilityfoundation/mobility-data-specification/tree/dev/agency#vehicle---event Events}
   */
  app.post(pathPrefix('/vehicles/:device_id/event'), validateDeviceId, submitVehicleEvent)

  /**
   * Endpoint to submit telemetry
   * See {@link https://github.com/openmobilityfoundation/mobility-data-specification/tree/dev/agency#vehicles---update-telemetry Telemetry}
   */
  app.post(pathPrefix('/vehicles/telemetry'), submitVehicleTelemetry)

  // ///////////////////// begin Agency candidate endpoints ///////////////////////

  /**
   * Not currently in Agency spec.  Ability to read back all vehicle IDs.
   */
  app.get(
    pathPrefix('/admin/vehicle_ids'),
    checkAgencyApiAccess(scopes => scopes.includes('admin:all')),
    readAllVehicleIds
  )

  // /////////////////// end Agency candidate endpoints ////////////////////

  app.get(
    pathPrefix('/admin/cache/info'),
    checkAgencyApiAccess(scopes => scopes.includes('admin:all')),
    getCacheInfo
  )

  // wipe a device -- sandbox or admin use only
  app.get(
    pathPrefix('/admin/wipe/:device_id'),
    checkAgencyApiAccess(scopes => scopes.includes('admin:all')),
    validateDeviceId,
    wipeDevice
  )

  app.get(
    pathPrefix('/admin/cache/refresh'),
    checkAgencyApiAccess(scopes => scopes.includes('admin:all')),
    refreshCache
  )

  /* Experimental Endpoint */
  app.post(pathPrefix('/trips'), writeTripMetadata)
  app.patch(pathPrefix('/trips'), writeTripMetadata)
  return app
}

// ///////////////////// end test-only endpoints ///////////////////////

export { api }
