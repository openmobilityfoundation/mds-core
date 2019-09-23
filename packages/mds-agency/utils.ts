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
import areas from 'ladot-service-areas'
import stream from '@mds-core/mds-stream'
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
import db from '@mds-core/mds-db'
import log from '@mds-core/mds-logger'
import cache from '@mds-core/mds-cache'

export function badDevice(device: Device): Partial<{ error: string; error_description: string }> | boolean {
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

export async function getVehicles(
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
    const flat: { [key: string]: number } = { ...reqQuery, ...query }
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


const usBounds = {
  latMax: 49.45,
  latMin: 24.74,
  lonMax: -66.94,
  lonMin: -124.79
}

export function badTelemetry(telemetry: Telemetry | null | undefined): ErrorObject | null {
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
export async function badEvent(event: VehicleEvent) {
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

export function lower(s: string): string {
  if (typeof s === 'string') {
    return s.toLowerCase()
  }
  return s
}

/**
 * set the service area on an event based on its gps
 */
export function getServiceArea(event: VehicleEvent): UUID | null {
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

export async function writeTelemetry(telemetry: Telemetry | Telemetry[]) {
  const recorded_telemetry = await db.writeTelemetry(Array.isArray(telemetry) ? telemetry : [telemetry])
  await Promise.all([cache.writeTelemetry(recorded_telemetry), stream.writeTelemetry(recorded_telemetry)])
  return recorded_telemetry
}

export async function refresh(device_id: UUID, provider_id: UUID): Promise<string> {
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