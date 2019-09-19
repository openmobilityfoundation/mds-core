/* eslint-disable promise/no-nesting */
/* eslint-disable promise/always-return */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { asPagingParams, asJsonApiLinks } from '@mds-core/mds-api-helpers'
import logger from '@mds-core/mds-logger'
import db from '@mds-core/mds-db'
import { isUUID, now, seconds, round } from '@mds-core/mds-utils'
import { ReadEventsResult, StatusChange, Trip } from '@mds-core/mds-db/types'
import {
  VehicleEvent,
  VEHICLE_TYPE,
  PROPULSION_TYPE,
  Telemetry,
  UUID,
  Device,
  VEHICLE_EVENTS
} from '@mds-core/mds-types'
import { providerName } from '@mds-core/mds-providers'
import { Feature, FeatureCollection } from 'geojson'
import { asStatusChangeEvent } from './utils'
import { ProviderApiRequest, ProviderApiResponse, PROVIDER_VERSION } from './types'

// Legacy /status_changes
function asPoint(telemetry: Telemetry): Feature | null {
  if (!telemetry) {
    return null
  }
  return {
    type: 'Feature',
    properties: {
      timestamp: telemetry.timestamp
    },
    geometry: {
      type: 'Point',
      coordinates: [round(telemetry.gps.lng, 6), round(telemetry.gps.lat, 6)]
    }
  }
}

async function getDevice(device_id: UUID): Promise<Device> {
  // TODO get device from cache, and if not cache, db
  return db.readDevice(device_id)
}

async function eventAsStatusChange(event: VehicleEvent): Promise<StatusChange> {
  const telemetry_timestamp = event.telemetry_timestamp || event.timestamp
  const [device, telemetry] = await Promise.all([
    getDevice(event.device_id),
    db.readTelemetry(event.device_id, telemetry_timestamp, telemetry_timestamp)
  ])
  const event2 = asStatusChangeEvent(event)
  if (!event2.event_type_reason) {
    throw new Error(
      `invalid empty provider event_type_reason for agency event ${event.event_type}/${event.event_type_reason}` +
        `and provider event_type ${event2.event_type}`
    )
  }
  const hasTelemetry: boolean = telemetry.length > 0
  return {
    provider_id: device.provider_id,
    provider_name: providerName(device.provider_id),
    device_id: event.device_id,
    vehicle_id: device.vehicle_id,
    vehicle_type: device.type as VEHICLE_TYPE,
    propulsion_type: device.propulsion as PROPULSION_TYPE[],
    event_type: event2.event_type,
    event_type_reason: event2.event_type_reason,
    event_time: event.timestamp,
    event_location: hasTelemetry ? asPoint(telemetry[0]) : null,
    battery_pct: hasTelemetry ? telemetry[0].charge || null : null,
    associated_trip: event.trip_id || null,
    recorded: event.recorded
  }
}

async function eventsAsStatusChanges(events: VehicleEvent[]): Promise<StatusChange[]> {
  const result = await Promise.all(events.map(event => eventAsStatusChange(event)))
  return result
}

async function getEventsAsStatusChanges(req: ProviderApiRequest, res: ProviderApiResponse) {
  const { start_time, end_time, start_recorded, end_recorded, device_id } = req.query
  const { skip, take } = asPagingParams(req.query)
  const stringifiedQuery = JSON.stringify(req.query)

  function fail(err: Error | string): void {
    const desc = err instanceof Error ? err.message : err
    const stack = err instanceof Error ? err.stack : desc
    logger.error('/status_changes', stringifiedQuery, 'failed', desc, stack || JSON.stringify(err))

    if (err instanceof Error && err.message.includes('invalid device_id')) {
      res.status(400).send({
        error: 'invalid',
        error_description: 'invalid device_id'
      })
    } else {
      /* istanbul ignore next no good way to fake server failure right now */
      res.status(500).send({
        error: 'server_failure',
        error_description: `status_changes internal error: ${desc}`
      })
    }
  }

  if (device_id !== undefined && !isUUID(device_id)) {
    fail(new Error(`invalid device_id ${device_id}`))
  } else {
    const params = {
      skip,
      take,
      start_time,
      end_time,
      start_recorded,
      end_recorded,
      device_id
    }

    // read events
    const readEventsStart = now()
    db.readEvents(params)
      .then((result: ReadEventsResult) => {
        const { count, events } = result
        const readEventsEnd = now()
        const asStatusChangesStart = now()
        const readEventsDuration = readEventsEnd - readEventsStart
        const readEventsMsg = `/status_changes ${stringifiedQuery} read ${events.length} of ${count} in ${readEventsDuration} ms`
        if (readEventsDuration < seconds(15)) {
          logger.info(readEventsMsg)
        } else {
          logger.warn(readEventsMsg)
        }
        // change events into status changes
        eventsAsStatusChanges(events)
          .then(status_changes => {
            const asStatusChangesEnd = now()
            const asStatusChangesDuration = asStatusChangesEnd - asStatusChangesStart
            const asStatusChangesMsg = `/status_changes ${stringifiedQuery} returned ${status_changes.length} in ${asStatusChangesDuration} ms`
            if (asStatusChangesDuration < seconds(15)) {
              logger.info(asStatusChangesMsg)
            } else {
              logger.warn(asStatusChangesMsg)
            }
            res.status(200).send({
              version: PROVIDER_VERSION,
              data: {
                status_changes
              },
              links: asJsonApiLinks(req, skip, take, count)
            })
          }, fail)
          .catch(fail)
      }, fail)
      .catch(fail)
  }
}

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

function asFeatureCollection(items: Telemetry[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items.map((item: Telemetry) => asFeature(item))
  }
}

async function asRoute(trip_start: VehicleEvent, trip_end: VehicleEvent): Promise<FeatureCollection> {
  const telemetry: Telemetry[] = await db.readTelemetry(trip_start.device_id, trip_start.timestamp, trip_end.timestamp)
  return Promise.resolve(asFeatureCollection(telemetry))
}

async function asEventTrip(trip_id: UUID, trip_start: VehicleEvent, trip_end: VehicleEvent): Promise<Trip> {
  const device = await getDevice(trip_start.device_id || trip_end.device_id)
  const route = await asRoute(trip_start, trip_end)
  return {
    provider_id: device.provider_id,
    provider_name: providerName(device.provider_id),
    device_id: device.device_id,
    vehicle_id: device.vehicle_id,
    vehicle_type: device.type as VEHICLE_TYPE,
    propulsion_type: device.propulsion as PROPULSION_TYPE[],
    provider_trip_id: trip_id,
    trip_duration: trip_end.timestamp - trip_start.timestamp,
    trip_distance: 0, // TODO
    route,
    accuracy: 1, // TODO
    trip_start: trip_start.timestamp,
    trip_end: trip_end.timestamp,
    parking_verification_url: 'unknown', // TODO
    standard_cost: 0, // TODO
    actual_cost: 0, // TODO
    recorded: now()
  }
}

async function buildEventTrip(trip_id: UUID): Promise<Trip | null> {
  const { events } = await db.readEvents({ trip_id })
  const trip_start = events.find(e => e.event_type === VEHICLE_EVENTS.trip_start)
  const trip_end = events.find(e => e.event_type === VEHICLE_EVENTS.trip_end)
  if (trip_start && trip_end && trip_start.trip_id && trip_end.trip_id) {
    const trip = await asEventTrip(trip_id, trip_start, trip_end)
    return trip
  }
  return null
}

async function asEventTrips(trip_ids: UUID[]): Promise<Trip[]> {
  logger.info('asTrips', trip_ids.length, 'trip_ids', trip_ids)
  const trips = await Promise.all(trip_ids.map(buildEventTrip))
  return trips.filter(trip => trip !== null) as Trip[]
}

// Legacy /trips
async function getEventsAsTrips(req: ProviderApiRequest, res: ProviderApiResponse) {
  const { skip, take } = asPagingParams(req.query)
  const { start_time, end_time, device_id } = req.query

  const PAGE_SIZE = 10 // set low because this is an expensive query.

  if (device_id && !isUUID(device_id)) {
    return res.status(400).send({
      result: `invalid device_id ${device_id} is not a UUID`
    })
  }

  const params = {
    skip,
    take: Math.min(take, PAGE_SIZE),
    start_time,
    end_time,
    device_id,
    event_types: [VEHICLE_EVENTS.trip_start, VEHICLE_EVENTS.trip_end]
  }

  try {
    const { count, tripIds } = await db.readTripIds(params)
    const trips = await asEventTrips(tripIds)
    res.status(200).send({
      version: PROVIDER_VERSION,
      data: {
        trips
      },
      links: asJsonApiLinks(req, skip, take, count)
    })
  } catch (err) {
    const desc = err instanceof Error ? err.message : err
    res.status(500).send({
      error: 'internal_failure',
      error_description: `trips error: ${desc}`
    })
  }
}

export { getEventsAsStatusChanges, getEventsAsTrips }
