import { AgencyApiRequest, AgencyApiResponse } from '@mds-core/mds-agency/types'
import areas from 'ladot-service-areas'
import log from '@mds-core/mds-logger'
import { isUUID, now, ServerError, ValidationError, NotFoundError, normalizeToArray } from '@mds-core/mds-utils'
import { isValidStop, isValidDevice, validateEvent, isValidTelemetry } from '@mds-core/mds-schema-validators'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import stream from '@mds-core/mds-stream'
import { providerName } from '@mds-core/mds-providers'
import {
  Device,
  VehicleEvent,
  Telemetry,
  ErrorObject,
  DeviceID,
  VEHICLE_STATUSES,
  EVENT_STATUS_MAP,
  VEHICLE_EVENT,
  VEHICLE_REASON,
  UUID
} from '@mds-core/mds-types'
import urls from 'url'
import {
  badDevice,
  getVehicles,
  lower,
  writeTelemetry,
  badEvent,
  badTelemetry,
  getServiceArea,
  writeRegisterEvent,
  readPayload,
  computeCompositeVehicleData
} from './utils'

// eslint-disable-next-line @typescript-eslint/no-floating-promises
stream.initialize()

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

  const { provider_id } = res.locals
  const { device_id, vehicle_id, type, propulsion, year, mfgr, model } = body

  const status = VEHICLE_STATUSES.removed

  const device = {
    provider_id,
    device_id,
    vehicle_id,
    type,
    propulsion,
    year,
    mfgr,
    model,
    recorded,
    status
  }

  try {
    isValidDevice(device)
  } catch (err) {
    log.info(`Device ValidationError for ${providerName(provider_id)}. Error: ${err}`)
  }

  const failure = badDevice(device)
  if (failure) {
    return res.status(400).send(failure)
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
      await writeRegisterEvent(device, recorded)
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

export const getVehicleById = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  const { device_id } = req.params

  const { cached } = req.query

  const { provider_id } = res.locals.scopes.includes('vehicles:read') ? req.query : res.locals

  log.info(`/vehicles/${device_id}`, cached)
  const store = cached ? cache : db
  const payload = await readPayload(store, device_id)
  if (!payload.device || (provider_id && payload.device.provider_id !== provider_id)) {
    res.status(404).send({
      error: 'not_found'
    })
    return
  }
  const compositeData = computeCompositeVehicleData(payload)
  res.status(200).send(compositeData)
}

export const getVehiclesByProvider = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  let { skip, take } = req.query
  const PAGE_SIZE = 1000

  skip = parseInt(skip) || 0
  take = parseInt(take) || PAGE_SIZE

  const url = urls.format({
    protocol: req.get('x-forwarded-proto') || req.protocol,
    host: req.get('host'),
    pathname: req.path
  })

  // TODO: Replace with express middleware
  const { provider_id } = res.locals.scopes.includes('vehicles:read') ? req.query : res.locals

  try {
    const response = await getVehicles(skip, take, url, provider_id, req.query)
    return res.status(200).send(response)
  } catch (err) {
    await log.error('getVehicles fail', err)
    res.status(500).send(new ServerError())
  }
}

export async function updateVehicleFail(
  req: AgencyApiRequest,
  res: AgencyApiResponse,
  provider_id: UUID,
  device_id: UUID,
  err: Error | string
) {
  if (String(err).includes('not found')) {
    res.status(404).send({
      error: 'not_found'
    })
  } else if (String(err).includes('invalid')) {
    res.status(400).send({
      error: 'invalid_data'
    })
  } else if (!provider_id) {
    res.status(404).send({
      error: 'not_found'
    })
  } else {
    await log.error(providerName(provider_id), `fail PUT /vehicles/${device_id}`, req.body, err)
    res.status(500).send(new ServerError())
  }
}

export const updateVehicle = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
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
      await Promise.all([cache.writeDevice(device), stream.writeDevice(device)])
      return res.status(201).send({
        result: 'success',
        vehicle: device
      })
    }
  } catch (err) {
    await updateVehicleFail(req, res, provider_id, device_id, 'not found')
  }
}

export const submitVehicleEvent = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  const { device_id } = req.params

  const { provider_id } = res.locals
  const name = providerName(provider_id || 'unknown')

  const recorded = now()

  const event: VehicleEvent = {
    device_id: req.params.device_id,
    provider_id: res.locals.provider_id,
    event_type: lower(req.body.event_type) as VEHICLE_EVENT,
    event_type_reason: lower(req.body.event_type_reason) as VEHICLE_REASON,
    telemetry: req.body.telemetry ? { ...req.body.telemetry, provider_id: res.locals.provider_id } : null,
    timestamp: req.body.timestamp,
    trip_id: req.body.trip_id,
    recorded,
    telemetry_timestamp: undefined, // added for diagnostic purposes
    service_area_id: null // added for diagnostic purposes
  }

  try {
    validateEvent(event)
  } catch (err) {
    log.info(`Event ValidationError for ${providerName(provider_id)}. Error: ${err}`)
  }

  if (event.telemetry) {
    event.telemetry_timestamp = event.telemetry.timestamp
  }

  async function success() {
    function fin() {
      res.status(201).send({
        result: 'success',
        recorded,
        device_id,
        status: EVENT_STATUS_MAP[event.event_type]
      })
    }
    const delta = now() - recorded

    if (delta > 100) {
      await log.info(name, 'post event took', delta, 'ms')
      fin()
    } else {
      fin()
    }
  }

  /* istanbul ignore next */
  async function fail(err: Error | Partial<{ message: string }>): Promise<void> {
    const message = err.message || String(err)
    if (message.includes('duplicate')) {
      await log.info(name, 'duplicate event', event.event_type)
      res.status(409).send({
        error: 'duplicate_event',
        error_description: 'an event with this device_id and timestamp has already been received'
      })
    } else if (message.includes('not found') || message.includes('unregistered')) {
      await log.info(name, 'event for unregistered', event.device_id, event.event_type)
      res.status(400).send({
        error: 'unregistered',
        error_description: 'the specified device_id has not been registered'
      })
    } else {
      await log.error('post event fail:', event, message)
      res.status(500).send(new ServerError())
    }
  }

  // TODO switch to cache for speed?
  try {
    const device = await db.readDevice(event.device_id, provider_id)
    try {
      await cache.readDevice(event.device_id)
    } catch (err) {
      await Promise.all([cache.writeDevice(device), stream.writeDevice(device)])
      log.info('Re-adding previously deregistered device to cache', err)
    }
    if (event.telemetry) {
      event.telemetry.device_id = event.device_id
    }
    const failure = (await badEvent(event)) || (event.telemetry ? badTelemetry(event.telemetry) : null)
    // TODO unify with fail() above
    if (failure) {
      log.info(name, 'event failure', failure, event)
      return res.status(400).send(failure)
    }

    // make a note of the service area
    event.service_area_id = getServiceArea(event)

    const { telemetry } = event
    if (telemetry) {
      await db.writeTelemetry(normalizeToArray(telemetry))
    }

    // database write is crucial; failures of cache/stream should be noted and repaired
    const recorded_event = await db.writeEvent(event)

    try {
      await Promise.all([cache.writeEvent(recorded_event), stream.writeEvent(recorded_event)])

      if (telemetry) {
        telemetry.recorded = recorded
        await Promise.all([cache.writeTelemetry([telemetry]), stream.writeTelemetry([telemetry])])
      }

      await success()
    } catch (err) {
      await log.warn('/event exception cache/stream/socket', err)
      await success()
    }
  } catch (err) {
    await fail(err)
  }
}

export const submitVehicleTelemetry = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  const start = Date.now()

  const { data } = req.body
  const { provider_id } = res.locals
  if (!provider_id) {
    res.status(400).send({
      error: 'bad_param',
      error_description: 'bad or missing provider_id'
    })
    return
  }
  const name = providerName(provider_id)
  const failures: string[] = []
  const valid: Telemetry[] = []

  const recorded = now()
  const p: Promise<Device | DeviceID[]> =
    data.length === 1 && isUUID(data[0].device_id)
      ? db.readDevice(data[0].device_id, provider_id)
      : db.readDeviceIds(provider_id)
  try {
    const deviceOrDeviceIds = await p
    const deviceIds = Array.isArray(deviceOrDeviceIds) ? deviceOrDeviceIds : [deviceOrDeviceIds]
    for (const item of data) {
      // make sure the device exists
      const { gps } = item
      const telemetry: Telemetry = {
        device_id: item.device_id,
        provider_id,
        timestamp: item.timestamp,
        charge: item.charge,
        gps: {
          lat: gps.lat,
          lng: gps.lng,
          altitude: gps.altitude,
          heading: gps.heading,
          speed: gps.speed,
          accuracy: gps.hdop,
          satellites: gps.satellites
        },
        recorded
      }

      try {
        isValidTelemetry(telemetry)
      } catch (err) {
        log.info(`Telemetry ValidationError for ${providerName(provider_id)}. Error: ${err}`)
      }

      const bad_telemetry: ErrorObject | null = badTelemetry(telemetry)
      if (bad_telemetry) {
        const msg = `bad telemetry for device_id ${telemetry.device_id}: ${bad_telemetry.error_description}`
        // append to failure
        failures.push(msg)
      } else if (!deviceIds.some(item2 => item2.device_id === telemetry.device_id)) {
        const msg = `device_id ${telemetry.device_id}: not found`
        failures.push(msg)
      } else {
        valid.push(telemetry)
      }
    }

    if (valid.length) {
      const recorded_telemetry = await writeTelemetry(valid)

      const delta = Date.now() - start
      if (delta > 300) {
        log.info(
          name,
          'writeTelemetry',
          valid.length,
          `(${recorded_telemetry.length} unique)`,
          'took',
          delta,
          `ms (${Math.round((1000 * valid.length) / delta)}/s)`
        )
      }
      if (recorded_telemetry.length) {
        res.status(201).send({
          result: `telemetry success for ${valid.length} of ${data.length}`,
          recorded: now(),
          unique: recorded_telemetry.length,
          failures
        })
      } else {
        await log.info(name, 'no unique telemetry in', data.length, 'items')
        res.status(400).send({
          error: 'invalid_data',
          error_description: 'none of the provided data was unique',
          result: 'no new valid telemetry submitted',
          unique: 0
        })
      }
    } else {
      const body = `${JSON.stringify(req.body).substring(0, 128)} ...`
      const fails = `${JSON.stringify(failures).substring(0, 128)} ...`
      log.info(name, 'no valid telemetry in', data.length, 'items:', body, 'failures:', fails)
      res.status(400).send({
        error: 'invalid_data',
        error_description: 'none of the provided data was valid',
        result: 'no valid telemetry submitted',
        failures
      })
    }
  } catch (err) {
    res.status(400).send({
      error: 'invalid_data',
      error_description: 'none of the provided data was valid',
      result: 'no valid telemetry submitted',
      failures: [`device_id ${data[0].device_id}: not found`]
    })
  }
}

export const registerStop = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  const stop = req.body

  try {
    isValidStop(stop)
    const recorded_stop = await db.writeStop(stop)
    return res.status(201).send(recorded_stop)
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).send(err.message)
    }
    if (err instanceof ValidationError) {
      return res.status(400).send({ error: err })
    }

    return res.status(500).send(new ServerError())
  }
}

export const readStop = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  const { stop_id } = req.params
  try {
    const recorded_stop = await db.readStop(stop_id)

    if (!recorded_stop) {
      return res.status(404).send(new NotFoundError())
    }

    res.status(200).send(recorded_stop)
  } catch (err) {
    res.status(500).send(new ServerError())
  }
}

export const readStops = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  try {
    const stops = await db.readStops()

    if (!stops) {
      return res.status(404).send(new NotFoundError())
    }

    res.status(200).send(stops)
  } catch (err) {
    return res.status(500).send(new ServerError())
  }
}
