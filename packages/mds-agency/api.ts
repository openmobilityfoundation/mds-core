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
import urls from 'url'

import { getVehicles } from 'mds-api-helpers'
import log from 'mds-logger'
import db from 'mds-db'
import cache from 'mds-cache'
import stream from 'mds-stream'
import { providers, providerName } from 'mds-providers'
import areas from 'ladot-service-areas'
import {
  UUID,
  Recorded,
  Device,
  VehicleEvent,
  Telemetry,
  ErrorObject,
  Timestamp,
  CountMap,
  DeviceID,
  TripsStats
} from 'mds'
import {
  isEnum,
  VEHICLE_EVENTS,
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
  VEHICLE_REASONS,
  PROPULSION_TYPES,
  EVENT_STATUS_MAP,
  VEHICLE_STATUS,
  VEHICLE_EVENT
} from 'mds-enums'
import {
  isUUID,
  isPct,
  isTimestamp,
  isFloat,
  pointInShape,
  now,
  days,
  inc,
  pathsFor,
  head,
  tail,
  isStateTransitionValid
} from 'mds-utils'
import { ServiceArea, AgencyApiRequest } from 'mds-agency/types'

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

  /**
   * for some functions we will want to validate the :device_id param
   */
  function validateDeviceId(req: express.Request, res: express.Response, next: Function): void {
    const { device_id } = req.params

    /* istanbul ignore if This is never called with no device_id parameter */
    if (!device_id) {
      log.warn('agency: missing device_id', req.originalUrl)
      res.status(400).send({
        error: 'missing_param',
        error_description: 'missing device_id'
      })
      return
    }
    if (device_id && !isUUID(device_id)) {
      log.warn('agency: bogus device_id', device_id, req.originalUrl)
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
  app.get(pathsFor('/service_areas'), (req, res) => {
    areas.readServiceAreas().then(
      (serviceAreas: object[]) => {
        log.info('readServiceAreas (all)', serviceAreas.length)
        res.status(200).send({
          service_areas: serviceAreas
        })
      },
      (err: object) => /* istanbul ignore next */ {
        log.error('failed to read service areas', err)
        res.status(404).send({
          result: 'not found'
        })
      }
    )
  })

  /**
   * Get a particular service area
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#service_areas Service Areas}
   */
  app.get(pathsFor('/service_areas/:service_area_id'), (req, res) => {
    const { service_area_id } = req.params

    if (!isUUID(service_area_id)) {
      return res.status(400).send({
        result: `invalid service_area_id ${service_area_id} is not a UUID`
      })
    }

    areas.readServiceAreas(undefined, service_area_id).then(
      (serviceAreas: ServiceArea[]) => {
        if (serviceAreas && serviceAreas.length > 0) {
          log.info('readServiceAreas (one)')
          res.status(200).send({
            service_areas: serviceAreas
          })
        } else {
          res.status(404).send({
            result: `${service_area_id} not found`
          })
        }
      },
      (err: Error | string) => /* istanbul ignore next */ {
        log.error('failed to read service area', err instanceof Error ? err.stack : err)
        res.status(404).send({
          result: 'not found'
        })
      }
    )
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
  app.post(pathsFor('/vehicles'), (req, res) => {
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
      status: undefined
    }

    const failure = badDevice(device)
    if (failure) {
      return res.status(400).send(failure)
    }

    function success(): void {
      device.status = VEHICLE_STATUSES.removed
      log.info('new', providerName(res.locals.provider_id), 'vehicle added', JSON.stringify(device)).then(() => {
        res.status(201).send({
          result: 'register device success',
          recorded,
          device
        })
      })
    }

    // writing to the DB is the crucial part.  other failures should be noted as bugs but tolerated
    // and fixed later.
    db.writeDevice(device).then(
      () => {
        Promise.all([cache.writeDevice(device), stream.writeDevice(device)]).then(success, success)
      },
      (err: Error | string) => /* istanbul ignore next */ {
        if (String(err).includes('duplicate')) {
          res.status(409).send({
            error: 'already_registered',
            error_description: 'A vehicle with this device_id is already registered'
          })
        } else {
          log.error(providerName(res.locals.provider_id), 'register vehicle failed:', err).then(() => {
            res.status(500).send(SERVER_ERROR)
          })
        }
      }
    )
  })

  /**
   * Read back a vehicle.
   */
  app.get(pathsFor('/vehicles/:device_id'), validateDeviceId, (req, res) => {
    const { device_id } = req.params

    const { cached } = req.query

    const { provider_id } = getAuth(req)

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
      } // device with extra goo for current status

      /* eslint-disable no-param-reassign */
      if (event) {
        composite.prev_event = event.event_type
        composite.updated = event.timestamp
        composite.status = (EVENT_STATUS_MAP[event.event_type] || 'unknown') as VEHICLE_STATUS
      } else {
        composite.status = VEHICLE_STATUSES.removed
      }
      if (telemetry) {
        if (telemetry.gps) {
          composite.gps = telemetry.gps
        }
      }
      /* eslint-enable no-param-reassign */
      res.send(composite)
    }

    log.info(`/vehicles/${device_id}`, cached)

    if (cached) {
      // log.info('ohai device cached')
      cache.readDevice(device_id).then(
        (device: Device) => {
          cache.readEvent(device_id).then(
            (event: VehicleEvent) => {
              cache
                .readTelemetry(device_id)
                .then(
                  (telemetry: Telemetry) => {
                    finish(device, event, telemetry)
                  },
                  () => {
                    finish(device, event, undefined)
                  }
                )
                .catch((ex: Error) => {
                  log.error('device cached fail', ex.stack)
                })
            },
            (err: Error) => {
              log.warn('no cached event for', device_id, err)
              cache
                .readTelemetry(device_id)
                .then(
                  (telemetry: Telemetry) => {
                    finish(device, undefined, telemetry)
                  },
                  () => {
                    finish(device, undefined, undefined)
                  }
                )
                .catch((ex: Error) => {
                  log.error('device cached fail', ex.stack)
                })
            }
          )
        },
        (err: Error) => {
          // failed
          log.warn(providerName(res.locals.provider_id), `fail GET /vehicles/${device_id}`).then(() => {
            log.error(err)
            res.status(404).send({
              error: 'not_found'
            })
          })
        }
      )
    } else {
      db.readDevice(device_id)
        .then(
          (device: Device) => {
            db.readEvent(device_id)
              .then(
                (event: VehicleEvent) => {
                  db.readTelemetry(device_id).then((telemetry: Recorded<Telemetry>[]) => {
                    finish(device, event, telemetry[0])
                  })
                },
                (err: Error) => {
                  log.warn('no latest event for', device_id, err)
                  db.readTelemetry(device_id).then((telemetry: Recorded<Telemetry>[]) => {
                    finish(device, undefined, telemetry[0])
                  })
                }
              )
              .catch((ex: Error) => /* istanbul ignore next */ {
                log.error('fail db looking for event', ex.stack)
                res.status(500).send(SERVER_ERROR)
              })
          },
          (err: Error) => {
            // failed
            log.warn(providerName(res.locals.provider_id), `fail GET /vehicles/${device_id}`).then(() => {
              log.error(err)
              res.status(404).send({
                error: 'not_found'
              })
            })
          }
        )
        .catch((ex: Error) => /* istanbul ignore next */ {
          log.error('fail db looking for device', ex.stack).then(() => {
            res.status(500).send(SERVER_ERROR)
          })
        })
    }
  })

  /**
   * Read back all the vehicles for this provider_id, with pagination
   */
  app.get(pathsFor('/vehicles'), async (req, res) => {
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

    function fail(err: Error | string): void {
      log.error('readDeviceIds fail', err).then(() => {
        res.status(500).send(SERVER_ERROR)
      })
    }

    const response = await getVehicles(skip, take, url, provider_id, req.query).catch(fail)

    res.status(200).send(response)
  })

  // update the vehicle_id
  app.put(pathsFor('/vehicles/:device_id'), validateDeviceId, (req, res) => {
    const { device_id } = req.params

    const { vehicle_id } = req.body

    const update = {
      vehicle_id
    }

    const { provider_id } = getAuth(req)

    function fail(err: Error | string): void {
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
        log
          .error(providerName(provider_id), `fail PUT /vehicles/${device_id}`, JSON.stringify(req.body), err)
          .then(() => {
            res.status(500).send(SERVER_ERROR)
          })
      }
    }

    // verify that it's my device
    db.readDevice(device_id)
      .then((device2: Device) => {
        if (device2.provider_id !== provider_id) {
          fail('not found')
        } else {
          db.updateDevice(device_id, update)
            .then((device: Device) => {
              // update in cache
              // post event to stream
              Promise.all([cache.writeDevice(device), stream.writeDevice(device)])
                .then(() => {
                  res.status(201).send({
                    result: 'success',
                    vehicle: device
                  })
                }, fail)
                .catch(fail)
            }, fail)
            .catch(fail)
        }
      }, fail)
      .catch(fail)
  })

  /**
   * check telemetry element for validity
   * @param  {telemetry}
   * @return {false if the telemetry is legit}
   */
  // TODO: Joi
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
  function badEvent(event: VehicleEvent): ErrorObject | null {
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

    // TODO remove eventually -- Lime is spraying empty-string values
    if (event.trip_id === '') {
      /* eslint-disable no-param-reassign */
      event.trip_id = null
      /* eslint-enable no-param-reassign */
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
      case VEHICLE_EVENTS.reserve:
      case VEHICLE_EVENTS.cancel_reservation:
        return null
      default:
        log.info(`-------- mystery event_type ${event.event_type}`)
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

  /**
   * write telemetry to cache, stream, and db
   * @param  {telemetry or list of telemetry} telemetry
   * @return {Promise} batched promise for the three writes
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async function writeTelemetry(telemetry: Telemetry | Telemetry[]): Promise<any[]> {
    if (!Array.isArray(telemetry)) {
      /* eslint-disable no-param-reassign */
      telemetry = [telemetry]
      /* eslint-enable no-param-reassign */
    }
    const promises = [db.writeTelemetry(telemetry), cache.writeTelemetry(telemetry), stream.writeTelemetry(telemetry)]
    return Promise.all(promises)
  }

  /**
   * Endpoint to submit vehicle events
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#vehicle---event Events}
   */
  app.post(pathsFor('/vehicles/:device_id/event'), validateDeviceId, (req, res) => {
    const { device_id } = req.params

    const { provider_id } = getAuth(req)

    const recorded = now()

    const event: VehicleEvent = {
      device_id: req.params.device_id,
      provider_id: res.locals.provider_id,
      event_type: lower(req.body.event_type) as VEHICLE_EVENT,
      event_type_reason: lower(req.body.event_type_reason),
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

    function success(): void {
      res.status(201).send({
        result: 'success',
        recorded,
        device_id,
        status: EVENT_STATUS_MAP[event.event_type]
      })
    }

    /* istanbul ignore next */
    function fail(err: Error | Partial<{ message: string }>): void {
      const message = err.message || String(err)
      if (message.includes('duplicate')) {
        res.status(409).send({
          error: 'duplicate_event',
          error_description: 'an event with this device_id and timestamp has already been received'
        })
      } else if (message.includes('not found') || message.includes('unregistered')) {
        res.status(400).send({
          error: 'unregistered',
          error_description: 'the specified device_id has not been registered'
        })
      } else {
        log.error('post event fail:', JSON.stringify(event), message).then(() => {
          res.status(500).send(SERVER_ERROR)
        })
      }
    }

    function finish(): void {
      if (event.telemetry) {
        event.telemetry.recorded = recorded
        writeTelemetry(event.telemetry).then(success)
      } else {
        success()
      }
    }

    // TODO switch to cache for speed?
    db.readDeviceIds(provider_id)
      .then((items: DeviceID[]) => {
        if (!items.some(item => item.device_id === device_id)) {
          fail({
            message: 'not found'
          })
        } else {
          if (event.telemetry) {
            event.telemetry.device_id = event.device_id
          }
          const failure = badEvent(event) || (event.telemetry ? badTelemetry(event.telemetry) : null)
          // TODO unify with fail() above
          if (failure) {
            log.error(
              providerName(res.locals.provider_id),
              'event failure',
              JSON.stringify(failure),
              JSON.stringify(event)
            )
            return res.status(400).send(failure)
          }

          // make a note of the service area
          event.service_area_id = getServiceArea(event)

          // database write is crucial; failures of cache/stream should be noted and repaired
          db.writeEvent(event)
            .then(() => {
              Promise.all([cache.writeEvent(event), stream.writeEvent(event)])
                .then(finish)
                .catch(err => /* istanbul ignore next */ {
                  log.warn('/event exception cache/stream', err)
                  finish()
                })
            }, fail)
            .catch(fail)
        }
      }, fail)
      .catch(fail)
  })

  /**
   * Endpoint to submit telemetry
   * See {@link https://github.com/CityOfLosAngeles/mobility-data-specification/tree/dev/agency#vehicles---update-telemetry Telemetry}
   */
  app.post(pathsFor('/vehicles/telemetry'), (req, res) => {
    const start = Date.now()

    const { data } = req.body
    const { provider_id } = getAuth(req)
    if (!provider_id) {
      res.status(400).send({
        error: 'bad_param',
        error_description: 'missing provider_id'
      })
      return
    }
    const failures: string[] = []
    const valid: Telemetry[] = []

    const recorded = now()

    db.readDeviceIds(provider_id).then((device_ids: DeviceID[]) => {
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
        } else if (!device_ids.some(item2 => item2.device_id === telemetry.device_id)) {
          const msg = `device_id ${telemetry.device_id}: not found`
          failures.push(msg)
        } else {
          valid.push(telemetry)
        }
      }

      if (valid.length) {
        writeTelemetry(valid)
          .then(
            () => {
              const delta = Date.now() - start
              if (delta > 200) {
                log.info(
                  'writeTelemetry',
                  valid.length,
                  'took',
                  delta,
                  `ms (${Math.round((1000 * valid.length) / delta)}/s)`
                )
              }
              res.status(201).send({
                result: `telemetry success for ${valid.length} of ${data.length}`,
                recorded: now(),
                failures
              })
              // success
            },
            err => {
              /* istanbul ignore next */
              log.error(providerName(provider_id), 'writeTelemetry failure', err).then(() => {
                res.status(400).send({
                  error: 'bad_param',
                  error_description: 'one or more items already exist in the db'
                })
              })
            }
          )
          .catch(err => {
            log.error(providerName(provider_id), 'writeTelemetry exception', err.stack).then(() => {
              res.status(500).send(SERVER_ERROR)
            })
          })
      } else {
        const body = `${JSON.stringify(req.body).substring(0, 128)} ...`
        const fails = `${JSON.stringify(failures).substring(0, 128)} ...`
        log.info('no valid telemetry in', data.length, 'items:', body, 'failures:', fails).then(() => {
          res.status(400).send({
            error: 'invalid_data',
            error_description: 'none of the provided data was valid',
            result: 'no valid telemetry submitted',
            failures
          })
        })
      }
    })
  })

  // ///////////////////// begin Agency candidate endpoints ///////////////////////

  /**
   * Not currently in Agency spec.  Ability to read back all vehicle IDs.
   */
  app.get(pathsFor('/admin/vehicle_ids'), (req, res) => {
    // read all the devices
    const query_provider_id = req.query.provider_id

    if (query_provider_id && !isUUID(query_provider_id)) {
      return res.status(400).send({
        error: 'bad_param',
        error_description: `invalid provider_id ${query_provider_id} is not a UUID`
      })
    }

    log.info(query_provider_id ? providerName(query_provider_id) : null, 'get /vehicles')

    db.readDeviceIds(query_provider_id).then((items: DeviceID[]) => {
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
        return Object.assign(map, { [t.device_id]: t })
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
                  const event_type = event ? event.event_type : 'default'
                  inc(stat.event_type, event_type)
                  const status = EVENT_STATUS_MAP[event_type]
                  inc(stat.status, status)
                  // TODO latest-state should remove service_area_id if it's null
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
      const counts: CountMap = {}
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
            provider_info[pid].trips_last_24h = Number(row.count)
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
        .then((rows: { provider_id: UUID; count: number; slacount: number }[]) => {
          log.info('time since last event', rows)
          rows.map(row => {
            const pid = row.provider_id
            provider_info[pid] = provider_info[pid] || {}
            provider_info[pid].telemetry_counts_last_24h = row.count
            provider_info[pid].late_telemetry_counts_last_24h = row.slacount
          })
          resolve()
        })
        .catch(fail)
    }).catch(fail)

    const getNumVehiclesRegisteredLast24Hours = new Promise(resolve => {
      db.getNumVehiclesRegisteredLast24HoursByProvider(start_time, end_time)
        .then((rows: { provider_id: UUID; count: number }[]) => {
          log.info('num vehicles since last 24', rows)
          rows.map(row => {
            const pid = row.provider_id
            provider_info[pid] = provider_info[pid] || {}
            provider_info[pid].registered_last_24h = row.count
          })
          resolve()
        }, fail)
        .catch(fail)
    }).catch(fail)

    const getNumEventsLast24Hours = new Promise<void>(resolve => {
      db.getNumEventsLast24HoursByProvider(start_time, end_time)
        .then((rows: { provider_id: UUID; count: number }[]) => {
          rows.map(row => {
            const pid = row.provider_id
            provider_info[pid] = provider_info[pid] || {}
            provider_info[pid].events_last_24h = row.count
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
      .catch(err => {
        log.error('unable to fetch data from last 24 hours', err).then(() => {
          res.status(500).send(SERVER_ERROR)
        })
      })
  })

  app.get(pathsFor('/health'), (req, res) => {
    const health_info: { db?: object; stream?: object } = {}
    db.health()
      .then((result: { using: string; stats: object }) => {
        health_info.db = result

        stream
          .health()
          .then((result2: object) => {
            health_info.stream = result2
            res.status(200).send(health_info)
          })
          .catch((ex: Error) => {
            log.info('stream unreachable')
            log.info(ex)
            res.status(200).send({
              result: 'app is up, stream is unreachable'
            })
          })
      })
      .catch((ex: Error) => {
        log.info('db unreachable')
        log.info(ex)
        res.status(500).send({
          result: 'app is up, db is unreachable'
        })
      })
  })

  // /////////////////// end Agency candidate endpoints ////////////////////

  // ///////////////////// begin test-only endpoints ///////////////////////

  app.get(pathsFor('/test/initialize'), (req, res) => {
    Promise.all([db.initialize(), cache.initialize(), stream.initialize()])
      .then(
        kind => {
          res.send({
            result: `Database initialized (${kind})`
          })
        },
        err => {
          /* istanbul ignore next */
          log.error('initialize failed', err).then(() => {
            res.status(500).send(SERVER_ERROR)
          })
        }
      )
      .catch(err => {
        /* istanbul ignore next */
        log.error('initialize exception', err).then(() => {
          res.status(500).send(SERVER_ERROR)
        })
      })
  })

  app.get(pathsFor('/test/shutdown'), (req, res) => {
    Promise.all([cache.shutdown(), stream.shutdown(), db.shutdown()]).then(() => {
      log.info('shutdown complete (in theory)')
      res.send({
        result: 'cache/stream/db shutdown done'
      })
    })
  })

  app.get(pathsFor('/test/reset'), (req, res) => {
    cache.reset()
    res.send({
      result: 'cache reset done'
    })
  })

  // read-back for test purposes
  app.get(pathsFor('/test/vehicles/:device_id/event/:timestamp'), validateDeviceId, (req, res) => {
    const { device_id } = req.params
    let { timestamp } = req.params

    timestamp = parseInt(timestamp) || undefined

    const { cached } = req.query

    if (cached) {
      log.info('ohai event cached')
      // get latest
      cache.readEvent(device_id).then(
        (event: VehicleEvent) => {
          res.send(event)
        },
        (err: Error) => /* istanbul ignore next */ {
          // failed
          res.send({
            result: err
          })
        }
      )
    } else {
      log.info('ohai event db')
      db.readEvent(device_id, timestamp)
        .then(
          (event: VehicleEvent) => {
            res.send(event)
          },
          (err: Error) => /* istanbul ignore next */ {
            // did not find
            res.status(404).send({
              result: err
            })
          }
        )
        .catch((ex: Error) => /* istanbul ignore next */ {
          log.error('test read event fail', ex.stack)
          res.status(500).send(SERVER_ERROR)
        })
    }
  })

  app.get(pathsFor('/admin/cache/info'), (req, res) => {
    cache.info().then((details: object) => {
      log.warn('cache', JSON.stringify(details))
      res.send(details)
    })
  })

  // wipe a device -- sandbox or admin use only
  app.get(pathsFor('/admin/wipe/:device_id'), validateDeviceId, (req, res) => {
    const { device_id } = req.params

    log.info('about to wipe', device_id)
    cache
      .wipeDevice(device_id)
      .then(
        (result: number) => {
          log.info('cache wiped', result)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          db.wipeDevice(device_id).then((result2: any) => {
            log.info('db wiped', result2)
            if (result >= 1) {
              res.send({
                result: `successfully wiped ${device_id}`
              })
            } else {
              res.status(404).send({
                result: `${device_id} not found (${result})`
              })
            }
          })
        },
        (err: Error) => /* istanbul ignore next */ {
          log.error('device wipe', err)
        }
      )
      .catch((ex: Error) => /* istanbul ignore next */ {
        log.error('device wipe', ex.stack)
      })
  })

  async function refresh(device_id: UUID): Promise<string> {
    // TODO all of this back and forth between cache and db is slow
    const device = await db.readDevice(device_id)
    // log.info('refresh device', JSON.stringify(device))
    await cache.writeDevice(device)
    await db.readEvent(device_id).then(
      (event: VehicleEvent) => {
        // log.info('refresh event', JSON.stringify(event))
        return cache.writeEvent(event)
      },
      /* istanbul ignore next */ (err: Error) => {
        log.info('no events for', device_id, err)
        return Promise.resolve()
      }
    )
    await db.readTelemetry(device_id).then(
      (telemetry: Telemetry[]) => {
        // log.info('refresh telemetry', JSON.stringify(telemetry))
        return cache.writeTelemetry(telemetry)
      },
      /* istanbul ignore next */ (err: Error) => {
        log.info('no telemetry for', device_id, err)
        return Promise.resolve()
      }
    )
    return Promise.resolve('done')
  }

  app.get(pathsFor('/admin/cache/refresh'), (req, res) => {
    // wipe the cache and rebuild from db
    let { skip, take } = req.query
    skip = parseInt(skip) || 0
    take = parseInt(take) || 10000000000

    db.readDeviceIds()
      .then(
        (rows: DeviceID[]) => {
          let device_ids = rows.map(row => row.device_id)
          log.info('read', device_ids.length, 'device_ids. skip', skip, 'take', take)
          device_ids = device_ids.slice(skip, take + skip)
          log.info('device_ids', JSON.stringify(device_ids))

          const promises = device_ids.map((device_id: UUID) => refresh(device_id))
          Promise.all(promises).then(
            () => {
              // success
              res.send({
                result: `success for ${device_ids.length} devices`
              })
            },
            /* istanbul ignore next */ err => {
              // total or partial fail
              log.error('cache refresh fail', err)
              res.send({
                result: 'fail'
              })
            }
          )
        },
        /* istanbul ignore next */ (err: Error) => {
          log.error('cache refresh', err)
        }
      )
      .catch((ex: Error) => /* istanbul ignore next */ {
        log.error('cache refresh', ex.stack)
      })
  })

  // read-back for test purposes
  app.get(pathsFor('/test/vehicles/:device_id/telemetry/:timestamp'), validateDeviceId, (req, res) => {
    const { device_id, timestamp } = req.params

    db.readTelemetry(device_id, timestamp, timestamp)
      .then(
        (telemetry: Telemetry[]) => {
          if (Array.isArray(telemetry) && telemetry.length > 0) {
            res.send(telemetry[0])
          } else {
            res.status(404).send({
              result: 'not found'
            })
          }
        },
        /* istanbul ignore next */ (err: string) => {
          log.info('test read telemetry error', err)
          res.status(500).send(SERVER_ERROR)
        }
      )
      .catch((ex: Error) => /* istanbul ignore next */ {
        log.info('test read teelemetry exception', ex.stack)
        res.status(500).send(SERVER_ERROR)
      })
  })

  return app
}

// ///////////////////// end test-only endpoints ///////////////////////

// Export your Express configuration so that it can be consumed by the Lambda handler
export { api }
