import { AgencyApiRequest, AgencyApiResponse } from '@mds-core/mds-agency/types'
import areas from 'ladot-service-areas'
import log from '@mds-core/mds-logger'
import {
  isUUID,
  isPct,
  isTimestamp,
  isFloat,
  pointInShape,
  now,
  pathsFor,
  ServerError,
  isInsideBoundingBox
} from '@mds-core/mds-utils'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import stream from '@mds-core/mds-stream'
import { providerName, isProviderId } from '@mds-core/mds-providers'
import {
  UUID,
  Recorded,
  Device,
  VehicleEvent,
  Telemetry,
  ErrorObject,
  Timestamp,
  DeviceID,
  isEnum,
  VEHICLE_EVENTS,
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
  VEHICLE_REASONS,
  PROPULSION_TYPES,
  EVENT_STATUS_MAP,
  VEHICLE_STATUS,
  VEHICLE_EVENT,
  BoundingBox,
  VEHICLE_REASON
} from '@mds-core/mds-types'
import { badDevice } from './utils'

export const getAllServiceAreas = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  try {
    const serviceAreas = await areas.readServiceAreas()
    await log.info('readServiceAreas (all)', serviceAreas.length)
    return res.status(200).send({
      service_areas: serviceAreas
    })
  } catch (err) {
    /* istanbul ignore next */
    await log.error('failed to read service areas', err)
    return res.status(404).send({
      result: 'not found'
    })
  }
}

export const getServiceAreaById = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  const { service_area_id } = req.params

  if (!isUUID(service_area_id)) {
    return res.status(400).send({
      result: `invalid service_area_id ${service_area_id} is not a UUID`
    })
  }

  try {
    const serviceAreas = await areas.readServiceAreas(undefined, service_area_id)

    if (serviceAreas && serviceAreas.length > 0) {
      await log.info('readServiceAreas (one)')
      return res.status(200).send({
        service_areas: serviceAreas
      })
    }
  } catch {
    return res.status(404).send({
      result: `${service_area_id} not found`
    })
  }

  return res.status(404).send({
    result: `${service_area_id} not found`
  })
}

export const registerVehicle = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  const { body } = req
  const recorded = now()
  const device: Device = {
    provider_id: res.locals.provider_id,
    device_id: body.device_id,
    vehicle_id: body.vehicle_id,
    type: body.type,
    propulsion: body.propulsion,
    year: parseInt(body.year) || body.year,
    mfgr: body.mfgr,
    model: body.model,
    recorded,
    status: VEHICLE_STATUSES.removed
  }

  const failure = badDevice(device)
  if (failure) {
    return res.status(400).send(failure)
  }

  async function writeRegisterEvent() {
    const event: VehicleEvent = {
      device_id: device.device_id,
      provider_id: device.provider_id,
      event_type: VEHICLE_EVENTS.register,
      event_type_reason: null,
      telemetry: null,
      timestamp: recorded,
      trip_id: null,
      recorded,
      telemetry_timestamp: undefined,
      service_area_id: null
    }
    try {
      const recorded_event = await db.writeEvent(event)
      try {
        // writing to cache and stream is not fatal
        await Promise.all([cache.writeEvent(recorded_event), stream.writeEvent(recorded_event)])
      } catch (err) {
        await log.warn('/event exception cache/stream', err)
      }
    } catch (err) {
      await log.error('writeRegisterEvent failure', err)
      throw new Error('writeEvent exception db')
    }
  }

  // writing to the DB is the crucial part.  other failures should be noted as bugs but tolerated
  // and fixed later.
  try {
    await db.writeDevice(device)
    try {
      await Promise.all([cache.writeDevice(device), stream.writeDevice(device)])
    } catch (err) {
      await log.error('failed to write device stream/cache', err)
    }
    await log.info('new', providerName(res.locals.provider_id), 'vehicle added', device)
    try {
      await writeRegisterEvent()
    } catch (err) {
      await log.error('writeRegisterEvent failure', err)
    }
    res.status(201).send({ result: 'register device success', recorded, device })
  } catch (err) {
    if (String(err).includes('duplicate')) {
      res.status(409).send({
        error: 'already_registered',
        error_description: 'A vehicle with this device_id is already registered'
      })
    } else if (String(err).includes('db')) {
      await log.error(providerName(res.locals.provider_id), 'register vehicle failed:', err)
      res.status(500).send(new ServerError())
    } else {
      await log.error(providerName(res.locals.provider_id), 'register vehicle failed:', err)
      res.status(500).send(new ServerError())
    }
  }
}