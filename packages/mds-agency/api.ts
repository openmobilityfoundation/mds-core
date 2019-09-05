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
import urls from 'url'

import log from '@mds-core/mds-logger'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import stream from '@mds-core/mds-stream'
import { providerName, isProviderId } from '@mds-core/mds-providers'
import areas from 'ladot-service-areas'
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
import { AgencyApiRequest, AgencyApiResponse } from '@mds-core/mds-agency/types'

function api(app: express.Express): express.Express {
  /**
   * Agency-specific middleware to extract provider_id into locals, do some logging, etc.
   */
  app.use(async (req: AgencyApiRequest, res: AgencyApiResponse, next) => {
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

  /**
   * for some functions we will want to validate the :device_id param
   */
  async function validateDeviceId(req: express.Request, res: express.Response, next: Function) {
    const { device_id } = req.params

    /* istanbul ignore if This is never called with no device_id parameter */
    if (!device_id) {
      await log.warn('agency: missing device_id', req.originalUrl)
      res.status(400).send({
        error: 'missing_param',
        error_description: 'missing device_id'
      })
      return
    }
    if (device_id && !isUUID(device_id)) {
      await log.warn('agency: bogus device_id', device_id, req.originalUrl)
      res.status(400).send({
        error: 'bad_param',
        error_description: `invalid device_id ${device_id} is not a UUID`
      })
      return
    }
    next()
  }

  const usBounds = {
    latMax: 49.45,
    latMin: 24.74,
    lonMax: -66.94,
    lonMin: -124.79
  }

  // / ////////// gets ////////////////

  /**
   * Get all service areas
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#service_areas Service Areas}
   */
  app.get(pathsFor('/service_areas'), async (req: AgencyApiRequest, res: AgencyApiResponse) => {
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
  })

  /**
   * Get a particular service area
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#service_areas Service Areas}
   */
  app.get(pathsFor('/service_areas/:service_area_id'), async (req: AgencyApiRequest, res: AgencyApiResponse) => {
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
  })

  function badDevice(device: Device): Partial<{ error: string; error_description: string }> | boolean {
    if (!device.device_id) {
      return {
        error: 'missing_param',
        error_description: 'missing device_id'
      }
    }
    if (!isUUID(device.device_id)) {
      return {
        error: 'bad_param',
        error_description: `device_id ${device.device_id} is not a UUID`
      }
    }
    // propulsion is a list
    if (!Array.isArray(device.propulsion)) {
      return {
        error: 'missing_param',
        error_description: 'missing propulsion types'
      }
    }
    for (const prop of device.propulsion) {
      if (!isEnum(PROPULSION_TYPES, prop)) {
        return {
          error: 'bad_param',
          error_description: `invalid propulsion type ${prop}`
        }
      }
    }
    // if (device.year === undefined) {
    //     return {
    //         error: 'missing_param',
    //         error_description: 'missing integer field "year"'
    //     }
    // }
    if (device.year !== null && device.year !== undefined) {
      if (!Number.isInteger(device.year)) {
        return {
          error: 'bad_param',
          error_description: `invalid device year ${device.year} is not an integer`
        }
      }
      if (device.year < 1980 || device.year > 2020) {
        return {
          error: 'bad_param',
          error_description: `invalid device year ${device.year} is out of range`
        }
      }
    }
    if (device.type === undefined) {
      return {
        error: 'missing_param',
        error_description: 'missing enum field "type"'
      }
    }
    if (!isEnum(VEHICLE_TYPES, device.type)) {
      return {
        error: 'bad_param',
        error_description: `invalid device type ${device.type}`
      }
    }
    // if (device.mfgr === undefined) {
    //     return {
    //         error: 'missing_param',
    //         error_description: 'missing string field "mfgr"'
    //     }
    // }
    // if (device.model === undefined) {
    //     return {
    //         error: 'missing_param',
    //         error_description: 'missing string field "model"'
    //     }
    // }
    return false
  }

  /**
   * Endpoint to register vehicles
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#vehicle---register Register}
   */
  app.post(pathsFor('/vehicles'), async (req: AgencyApiRequest, res: AgencyApiResponse) => {
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
  })

  /**
   * Read back a vehicle.
   */
  app.get(pathsFor('/vehicles/:device_id'), validateDeviceId, async (req: AgencyApiRequest, res: AgencyApiResponse) => {
    const { device_id } = req.params

    const { cached } = req.query

    const { provider_id } = res.locals

    function finish(device: Device, event?: VehicleEvent, telemetry?: Recorded<Telemetry> | Telemetry): void {
      if (device.provider_id !== provider_id) {
        res.status(404).send({
          error: 'not_found'
        })
        return
      }
      const composite: Partial<
        Device & { prev_event?: string; updated?: Timestamp; gps?: Recorded<Telemetry>['gps'] }
      > = {
        ...device
      }

      if (event) {
        composite.prev_event = event.event_type
        composite.updated = event.timestamp
        composite.status = (EVENT_STATUS_MAP[event.event_type as VEHICLE_EVENT] || 'unknown') as VEHICLE_STATUS
      } else {
        composite.status = VEHICLE_STATUSES.removed
      }
      if (telemetry) {
        if (telemetry.gps) {
          composite.gps = telemetry.gps
        }
      }
      res.send(composite)
    }

    log.info(`/vehicles/${device_id}`, cached)
    if (cached) {
      try {
        const device = await cache.readDevice(device_id)
        const event = await cache.readEvent(device_id).catch(async err => {
          await log.warn(err)
          return undefined
        })
        const telemetry = await cache.readTelemetry(device_id).catch(async err => {
          await log.warn(err)
          return undefined
        })
        if (device) return finish(device, event, telemetry)
      } catch (err) {
        await log.warn(providerName(res.locals.provider_id), `fail GET /vehicles/${device_id}`)
        await log.error(err)
        res.status(404).send({
          error: 'not_found'
        })
      }
    } else {
      try {
        const device = await db.readDevice(device_id).catch(async err => {
          await log.error(err)
          res.status(404).send({
            error: 'not_found'
          })
        })
        const event = await db.readEvent(device_id).catch(async err => {
          await log.warn(err)
          return undefined
        })
        const telemetry = await db.readTelemetry(device_id)
        if (device) return finish(device, event, telemetry[0])
      } catch (err) {
        await log.error(err)
        res.status(500).send(new ServerError())
      }
    }
  })

  async function getVehicles(
    skip: number,
    take: number,
    url: string,
    provider_id: string,
    reqQuery: { [x: string]: string },
    bbox?: BoundingBox
  ): Promise<{
    total: number
    links: { first: string; last: string; prev: string | null; next: string | null }
    vehicles: (Device & { updated?: number | null; telemetry?: Telemetry | null })[]
  }> {
    function fmt(query: { skip: number; take: number }): string {
      const flat = Object.assign({}, reqQuery, query)
      let s = `${url}?`
      s += Object.keys(flat)
        .map(key => `${key}=${flat[key]}`)
        .join('&')
      return s
    }

    const rows = await db.readDeviceIds(provider_id)
    const total = rows.length
    log.info(`read ${total} deviceIds in /vehicles`)

    const events = await cache.readEvents(rows.map(record => record.device_id))
    const eventMap: { [s: string]: VehicleEvent } = {}
    events.map(event => {
      if (event) {
        eventMap[event.device_id] = event
      }
    })

    const deviceIdSuperset = bbox
      ? rows.filter(record => {
          return eventMap[record.device_id] ? isInsideBoundingBox(eventMap[record.device_id].telemetry, bbox) : true
        })
      : rows

    const deviceIdSubset = deviceIdSuperset.slice(skip, skip + take).map(record => record.device_id)
    const devices = (await db.readDeviceList(deviceIdSubset)).reduce((acc: Device[], device: Device) => {
      if (!device) {
        throw new Error('device in DB but not in cache')
      }
      const event = eventMap[device.device_id]
      const status = event ? EVENT_STATUS_MAP[event.event_type] : VEHICLE_STATUSES.removed
      const telemetry = event ? event.telemetry : null
      const updated = event ? event.timestamp : null
      return [...acc, { ...device, status, telemetry, updated }]
    }, [])

    const noNext = skip + take >= deviceIdSuperset.length
    const noPrev = skip === 0 || skip > deviceIdSuperset.length
    const lastSkip = take * Math.floor(deviceIdSuperset.length / take)

    return {
      total,
      links: {
        first: fmt({
          skip: 0,
          take
        }),
        last: fmt({
          skip: lastSkip,
          take
        }),
        prev: noPrev
          ? null
          : fmt({
              skip: skip - take,
              take
            }),
        next: noNext
          ? null
          : fmt({
              skip: skip + take,
              take
            })
      },
      vehicles: devices
    }
  }

  /**
   * Read back all the vehicles for this provider_id, with pagination
   */
  app.get(pathsFor('/vehicles'), async (req: AgencyApiRequest, res: AgencyApiResponse) => {
    let { skip, take } = req.query
    const PAGE_SIZE = 1000

    skip = parseInt(skip) || 0
    take = parseInt(take) || PAGE_SIZE

    const url = urls.format({
      protocol: req.get('x-forwarded-proto') || req.protocol,
      host: req.get('host'),
      pathname: req.path
    })

    const { provider_id } = res.locals

    try {
      const response = await getVehicles(skip, take, url, provider_id, req.query)
      return res.status(200).send(response)
    } catch (err) {
      await log.error('getVehicles fail', err)
      res.status(500).send(new ServerError())
    }
  })

  // update the vehicle_id
  app.put(pathsFor('/vehicles/:device_id'), validateDeviceId, async (req: AgencyApiRequest, res: AgencyApiResponse) => {
    const { device_id } = req.params

    const { vehicle_id } = req.body

    const update = {
      vehicle_id
    }

    const { provider_id } = res.locals

    async function fail(err: Error | string) {
      /* istanbul ignore else cannot easily test server failure */
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

    try {
      const tempDevice = await db.readDevice(device_id, provider_id)
      if (tempDevice.provider_id !== provider_id) {
        await fail('not found')
      } else {
        const device = await db.updateDevice(device_id, provider_id, update)
        await Promise.all([cache.writeDevice(device), stream.writeDevice(device)])
        return res.status(201).send({
          result: 'success',
          vehicle: device
        })
      }
    } catch (err) {
      await fail(err)
    }
  })

  function badTelemetry(telemetry: Telemetry | null | undefined): ErrorObject | null {
    if (!telemetry) {
      return {
        error: 'missing_param',
        error_description: 'invalid missing telemetry'
      }
    }

    const { device_id, timestamp, gps, charge } = telemetry

    if (typeof gps !== 'object') {
      return {
        error: 'missing_param',
        error_description: 'invalid missing gps'
      }
    }

    const { altitude, accuracy, speed, satellites } = gps
    const { lat, lng } = gps

    // validate all parameters
    if (!isUUID(device_id)) {
      return {
        error: 'missing_param',
        error_description: 'no device_id included in telemetry'
      }
    }
    if (typeof lat !== 'number' || Number.isNaN(lat) || lat < usBounds.latMin || lat > usBounds.latMax) {
      return {
        error: 'bad_param',
        error_description: `invalid lat ${lat}`
      }
    }
    if (typeof lng !== 'number' || Number.isNaN(lng) || lng < usBounds.lonMin || lng > usBounds.lonMax) {
      return {
        error: 'bad_param',
        error_description: `invalid lng ${lng}`
      }
    }
    if (altitude !== undefined && !isFloat(altitude)) {
      return {
        error: 'bad_param',
        error_description: `invalid altitude ${altitude}`
      }
    }
    if (accuracy !== undefined && !isFloat(accuracy)) {
      return {
        error: 'bad_param',
        error_description: `invalid accuracy ${accuracy}`
      }
    }
    if (speed !== undefined && !isFloat(speed)) {
      return {
        error: 'bad_param',
        error_description: `invalid speed ${speed}`
      }
    }
    if (satellites !== undefined && satellites !== null && !Number.isInteger(satellites)) {
      return {
        error: 'bad_param',
        error_description: `invalid satellites ${satellites}`
      }
    }
    if (charge !== undefined && !isPct(charge)) {
      return {
        error: 'bad_param',
        error_description: `invalid charge ${charge}`
      }
    }
    if (!isTimestamp(timestamp)) {
      return {
        error: 'bad_param',
        error_description: `invalid timestamp ${timestamp} (note: should be in milliseconds)`
      }
    }
    return null
  }

  // TODO Joi
  async function badEvent(event: VehicleEvent) {
    if (event.timestamp === undefined) {
      return {
        error: 'missing_param',
        error_description: 'missing enum field "event_type"'
      }
    }
    if (!isTimestamp(event.timestamp)) {
      return {
        error: 'bad_param',
        error_description: `invalid timestamp ${event.timestamp}`
      }
    }
    if (event.event_type === undefined) {
      return {
        error: 'missing_param',
        error_description: 'missing enum field "event_type"'
      }
    }

    if (!isEnum(VEHICLE_EVENTS, event.event_type)) {
      return {
        error: 'bad_param',
        error_description: `invalid event_type ${event.event_type}`
      }
    }

    if (event.event_type_reason && !isEnum(VEHICLE_REASONS, event.event_type_reason)) {
      return {
        error: 'bad_param',
        error_description: `invalid event_type_reason ${event.event_type_reason}`
      }
    }

    if (event.trip_id === '') {
      /* eslint-reason TODO remove eventually -- Lime is spraying empty-string values */
      /* eslint-disable-next-line no-param-reassign */
      event.trip_id = null
    }

    const { trip_id } = event
    if (trip_id !== null && trip_id !== undefined && !isUUID(event.trip_id)) {
      return {
        error: 'bad_param',
        error_description: `invalid trip_id ${event.trip_id} is not a UUID`
      }
    }

    function missingTripId(): ErrorObject | null {
      if (!trip_id) {
        return {
          error: 'missing_param',
          error_description: 'missing trip_id'
        }
      }
      return null
    }

    // event-specific checking goes last
    switch (event.event_type) {
      case VEHICLE_EVENTS.trip_start:
        return badTelemetry(event.telemetry) || missingTripId()
      case VEHICLE_EVENTS.trip_end:
        return badTelemetry(event.telemetry) || missingTripId()
      case VEHICLE_EVENTS.trip_enter:
        return badTelemetry(event.telemetry) || missingTripId()
      case VEHICLE_EVENTS.trip_leave:
        return badTelemetry(event.telemetry) || missingTripId()
      case VEHICLE_EVENTS.service_start:
      case VEHICLE_EVENTS.service_end:
      case VEHICLE_EVENTS.provider_pick_up:
      case VEHICLE_EVENTS.provider_drop_off:
        return badTelemetry(event.telemetry)
      case VEHICLE_EVENTS.register:
      case VEHICLE_EVENTS.deregister:
      case VEHICLE_EVENTS.reserve:
      case VEHICLE_EVENTS.cancel_reservation:
        return null
      default:
        await log.warn(`unsure how to validate mystery event_type ${event.event_type}`)
        break
    }
    return null // we good
  }

  function lower(s: string): string {
    if (typeof s === 'string') {
      return s.toLowerCase()
    }
    return s
  }

  /**
   * set the service area on an event based on its gps
   */
  function getServiceArea(event: VehicleEvent): UUID | null {
    const tel = event.telemetry
    if (tel) {
      // TODO: filter service areas by effective date and not having a replacement
      const serviceAreaKeys = Object.keys(areas.serviceAreaMap).reverse()
      const status = EVENT_STATUS_MAP[event.event_type]
      switch (status) {
        case VEHICLE_STATUSES.available:
        case VEHICLE_STATUSES.unavailable:
        case VEHICLE_STATUSES.reserved:
        case VEHICLE_STATUSES.trip:
          for (const key of serviceAreaKeys) {
            const serviceArea = areas.serviceAreaMap[key]
            if (pointInShape(tel.gps, serviceArea.area)) {
              return key
            }
          }
          break
        default:
          break
      }
    }
    return null
  }

  async function writeTelemetry(telemetry: Telemetry | Telemetry[]) {
    const recorded_telemetry = await db.writeTelemetry(Array.isArray(telemetry) ? telemetry : [telemetry])
    await Promise.all([cache.writeTelemetry(recorded_telemetry), stream.writeTelemetry(recorded_telemetry)])
    return recorded_telemetry
  }
  /**
   * Endpoint to submit vehicle events
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#vehicle---event Events}
   */
  app.post(
    pathsFor('/vehicles/:device_id/event'),
    validateDeviceId,
    async (req: AgencyApiRequest, res: AgencyApiResponse) => {
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

      async function finish() {
        if (event.telemetry) {
          event.telemetry.recorded = recorded
          await writeTelemetry(event.telemetry)
          await success()
        } else {
          await success()
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

        // database write is crucial; failures of cache/stream should be noted and repaired
        const recorded_event = await db.writeEvent(event)
        try {
          await Promise.all([cache.writeEvent(recorded_event), stream.writeEvent(recorded_event)])
          await finish()
        } catch (err) {
          await log.warn('/event exception cache/stream', err)
          await finish()
        }
      } catch (err) {
        await fail(err)
      }
    }
  )

  /**
   * Endpoint to submit telemetry
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#vehicles---update-telemetry Telemetry}
   */
  app.post(pathsFor('/vehicles/telemetry'), async (req: AgencyApiRequest, res: AgencyApiResponse) => {
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
  })

  // ///////////////////// begin Agency candidate endpoints ///////////////////////

  /**
   * Not currently in Agency spec.  Ability to read back all vehicle IDs.
   */
  app.get(pathsFor('/admin/vehicle_ids'), async (req: AgencyApiRequest, res: AgencyApiResponse) => {
    // read all the devices
    const query_provider_id = req.query.provider_id

    if (query_provider_id && !isUUID(query_provider_id)) {
      return res.status(400).send({
        error: 'bad_param',
        error_description: `invalid provider_id ${query_provider_id} is not a UUID`
      })
    }

    await log.info(query_provider_id ? providerName(query_provider_id) : null, 'get /vehicles')

    const items = await db.readDeviceIds(query_provider_id)
    const data: { [s: string]: string[] } = {}
    const summary: { [s: string]: number } = {}
    items.map(item => {
      const { device_id, provider_id } = item
      if (data[provider_id]) {
        data[provider_id].push(device_id)
        summary[providerName(provider_id)] += 1
      } else {
        data[provider_id] = [device_id]
        summary[providerName(provider_id)] = 1
      }
    })

    res.send({
      result: 'success',
      summary,
      data
    })
  })

  // /////////////////// end Agency candidate endpoints ////////////////////

  app.get(pathsFor('/admin/cache/info'), async (req: AgencyApiRequest, res: AgencyApiResponse) => {
    const details = await cache.info()
    await log.warn('cache', details)
    res.send(details)
  })

  // wipe a device -- sandbox or admin use only
  app.get(
    pathsFor('/admin/wipe/:device_id'),
    validateDeviceId,
    async (req: AgencyApiRequest, res: AgencyApiResponse) => {
      try {
        const { device_id } = req.params
        await log.info('about to wipe', device_id)
        const cacheResult = await cache.wipeDevice(device_id)
        await log.info('cache wiped', cacheResult)
        const dbResult = await db.wipeDevice(device_id)
        await log.info('db wiped', dbResult)
        if (cacheResult >= 1) {
          res.send({
            result: `successfully wiped ${device_id}`
          })
        } else {
          res.status(404).send({
            result: `${device_id} not found (${cacheResult})`
          })
        }
      } catch (err) {
        await log.error(`/admin/wipe/:device_id failed`, err)
        res.status(500).send(new ServerError())
      }
    }
  )

  async function refresh(device_id: UUID, provider_id: UUID): Promise<string> {
    // TODO all of this back and forth between cache and db is slow
    const device = await db.readDevice(device_id, provider_id)
    // log.info('refresh device', device)
    await cache.writeDevice(device)
    try {
      const event = await db.readEvent(device_id)
      await cache.writeEvent(event)
    } catch (err) {
      await log.info('no events for', device_id, err)
    }
    try {
      await db.readTelemetry(device_id)
    } catch (err) {
      await log.info('no telemetry for', device_id, err)
    }
    return 'done'
  }

  app.get(pathsFor('/admin/cache/refresh'), async (req: AgencyApiRequest, res: AgencyApiResponse) => {
    // wipe the cache and rebuild from db
    let { skip, take } = req.query
    skip = parseInt(skip) || 0
    take = parseInt(take) || 10000000000

    try {
      const rows = await db.readDeviceIds()

      await log.info('read', rows.length, 'device_ids. skip', skip, 'take', take)
      const devices = rows.slice(skip, take + skip)
      await log.info('device_ids', devices)

      const promises = devices.map(device => refresh(device.device_id, device.provider_id))
      await Promise.all(promises)
      res.send({
        result: `success for ${devices.length} devices`
      })
    } catch (err) {
      await log.error('cache refresh fail', err)
      res.send({
        result: 'fail'
      })
    }
  })

  return app
}

// ///////////////////// end test-only endpoints ///////////////////////

export { api }
