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

import cache from '@mds-core/mds-agency-cache'
import { parseRequest } from '@mds-core/mds-api-helpers'
import db from '@mds-core/mds-db'
import { validateDeviceDomainModel } from '@mds-core/mds-ingest-service'
import logger from '@mds-core/mds-logger'
import { providerName } from '@mds-core/mds-providers'
import { validateTripMetadata } from '@mds-core/mds-schema-validators'
import stream from '@mds-core/mds-stream'
import { UUID, VEHICLE_STATE } from '@mds-core/mds-types'
import { now, ServerError, ValidationError } from '@mds-core/mds-utils'
import urls from 'url'
import {
  AgencyAipGetVehicleByIdResponse,
  AgencyApiGetVehicleByIdRequest,
  AgencyApiGetVehiclesByProviderRequest,
  AgencyApiGetVehiclesByProviderResponse,
  AgencyApiPostTripMetadataRequest,
  AgencyApiPostTripMetadataResponse,
  AgencyApiRegisterVehicleRequest,
  AgencyApiRegisterVehicleResponse,
  AgencyApiRequest,
  AgencyApiUpdateVehicleRequest,
  AgencyApiUpdateVehicleResponse,
  AgencyServerError
} from './types'
import { agencyValidationErrorParser, computeCompositeVehicleData, getVehicles, readPayload } from './utils'

export const registerVehicle = async (req: AgencyApiRegisterVehicleRequest, res: AgencyApiRegisterVehicleResponse) => {
  const { body } = req
  const recorded = now()

  const { provider_id, version } = res.locals

  if (!version || version === '0.4.1') {
    // TODO: Transform 0.4.1 -> 1.0.0
  }

  try {
    const {
      accessibility_options,
      device_id,
      vehicle_id,
      vehicle_type,
      propulsion_types,
      year,
      mfgr,
      modality,
      model
    } = body

    const status: VEHICLE_STATE = 'removed'

    const unvalidatedDevice = {
      accessibility_options,
      provider_id,
      device_id,
      vehicle_id,
      vehicle_type,
      propulsion_types,
      year,
      mfgr,
      modality,
      model,
      recorded,
      status
    }
    const device = validateDeviceDomainModel(unvalidatedDevice)

    // DB Write is critical, and failures to write to the cache/stream should be considered non-critical (though they are likely indicative of a bug).
    await db.writeDevice(device)
    try {
      await Promise.all([cache.writeDevice(device), stream.writeDevice(device)])
    } catch (error) {
      logger.error('failed to write device stream/cache', error)
    }

    logger.info('new vehicle added', { providerName: providerName(res.locals.provider_id), device })
    return res.status(201).send({})
  } catch (error) {
    if (error instanceof ValidationError) {
      const parsedError = agencyValidationErrorParser(error)
      return res.status(400).send(parsedError)
    }

    if (String(error).includes('duplicate')) {
      return res.status(409).send({
        error: 'already_registered',
        error_description: 'A vehicle with this device_id is already registered'
      })
    }

    logger.error('register vehicle failed:', { err: error, providerName: providerName(res.locals.provider_id) })
    return res.status(500).send(AgencyServerError)
  }
}

export const getVehicleById = async (req: AgencyApiGetVehicleByIdRequest, res: AgencyAipGetVehicleByIdResponse) => {
  const { device_id } = req.params

  const { provider_id } = res.locals.scopes.includes('vehicles:read')
    ? parseRequest(req).single().query('provider_id')
    : res.locals

  const payload = await readPayload(device_id)

  if (!payload.device || (provider_id && payload.device.provider_id !== provider_id)) {
    res.status(404).send({})
    return
  }
  const compositeData = computeCompositeVehicleData(payload)
  res.status(200).send({ ...compositeData })
}

export const getVehiclesByProvider = async (
  req: AgencyApiGetVehiclesByProviderRequest,
  res: AgencyApiGetVehiclesByProviderResponse
) => {
  const PAGE_SIZE = 1000

  const { skip = 0, take = PAGE_SIZE } = parseRequest(req).single({ parser: Number }).query('skip', 'take')

  const url = urls.format({
    protocol: req.get('x-forwarded-proto') || req.protocol,
    host: req.get('host'),
    pathname: req.path
  })

  // TODO: Replace with express middleware
  const { provider_id } = res.locals.scopes.includes('vehicles:read')
    ? parseRequest(req).single().query('provider_id')
    : res.locals

  try {
    const response = await getVehicles(skip, take, url, req.query, provider_id)
    return res.status(200).send({ ...response })
  } catch (err) {
    logger.error('getVehicles fail', err)
    return res.status(500).send(AgencyServerError)
  }
}

export async function updateVehicleFail(
  req: AgencyApiRequest,
  res: AgencyApiUpdateVehicleResponse,
  provider_id: UUID,
  device_id: UUID,
  error: Error | string
) {
  if (String(error).includes('not found')) {
    res.status(404).send({})
  } else if (String(error).includes('invalid')) {
    res.status(400).send({
      error: 'bad_param',
      error_description: 'Invalid parameters for vehicle were sent'
    })
  } else if (!provider_id) {
    res.status(404).send({})
  } else {
    logger.error(`fail PUT /vehicles/${device_id}`, { providerName: providerName(provider_id), body: req.body, error })
    res.status(500).send(AgencyServerError)
  }
}

export const updateVehicle = async (req: AgencyApiUpdateVehicleRequest, res: AgencyApiUpdateVehicleResponse) => {
  const { device_id } = req.params

  const { vehicle_id } = req.body

  const update = {
    vehicle_id
  }

  const { provider_id } = res.locals

  try {
    const tempDevice = await db.readDevice(device_id, provider_id)
    if (tempDevice.provider_id !== provider_id) {
      await updateVehicleFail(req, res, provider_id, device_id, 'not found')
    } else {
      const device = await db.updateDevice(device_id, provider_id, update)
      // TODO should we warn instead of fail if the cache/stream doesn't work?
      try {
        await Promise.all([cache.writeDevice(device), stream.writeDevice(device)])
      } catch (error) {
        logger.warn(`Error writing to cache/stream ${error}`)
      }
      return res.status(201).send({})
    }
  } catch (err) {
    await updateVehicleFail(req, res, provider_id, device_id, 'not found')
  }
}

/* Experimental Handler */
export const writeTripMetadata = async (
  req: AgencyApiPostTripMetadataRequest,
  res: AgencyApiPostTripMetadataResponse
) => {
  try {
    const { provider_id } = res.locals
    /* TODO Add better validation once trip metadata proposal is solidified */
    const tripMetadata = { ...validateTripMetadata({ ...req.body, provider_id }), recorded: Date.now() }
    await stream.writeTripMetadata(tripMetadata)

    return res.status(201).send(tripMetadata)
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).send({ error })
    return res.status(500).send({ error: new ServerError() })
  }
}
