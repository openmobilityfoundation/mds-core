import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import log from '@mds-core/mds-logger'
import { calcDistance, isUUID, now } from '@mds-core/mds-utils'
import { TripEvent, TripEntry, UUID, Timestamp } from '@mds-core/mds-types'
import { eventValidation, createTelemetryMap } from './utils'
import { getConfig } from './configuration'

/*
    Trip processor that runs inside a Kubernetes pod, activated via cron job.
    Aggregates event/telemety data into binned trips at a set interval. As trips
    are processed caches are cleaned.

    Processed trips are added to a postgres table:

        REPORTS_DEVICE_TRIPS:
          PRIMARY KEY = (provider_id, device_id, trip_id)
          VALUES = tripData
*/

async function processTrip(
  provider_id: UUID,
  device_id: UUID,
  trip_id: UUID,
  events: TripEvent[],
  curTime: Timestamp
): Promise<UUID | null> {
  const config = await getConfig()
  /*
    Add telemetry and meta data into database when a trip ends

    Examples:

        1) trip duration
        2) trip length
        3) SLA violations
        4) event binned telemetry

    We must compute these metrics here due to the potential of up to 24hr delay of telemetry data
  */

  // Validation
  events.sort((a, b) => a.timestamp - b.timestamp)
  if (!eventValidation(events, curTime, config.compliance_sla.max_telemetry_time)) {
    return null
  }

  // Calculate event binned trip telemetry data
  const telemetryMap = await cache.readTripsTelemetry(`${provider_id}:${device_id}`)
  if (telemetryMap) {
    // Get trip metadata
    const tripStartEvent = events[0]
    const tripEndEvent = events[events.length - 1]
    const baseTripData = {
      vehicle_type: tripStartEvent.vehicle_type,
      trip_id,
      device_id,
      provider_id,
      recorded: curTime,
      start_time: tripStartEvent.timestamp,
      end_time: tripEndEvent.timestamp,
      start_service_area_id: tripStartEvent.service_area_id,
      end_service_area_id: tripEndEvent.service_area_id
    }
    // Calculate trip metrics
    const telemetry = createTelemetryMap(events, telemetryMap, trip_id)
    const duration = tripEndEvent.timestamp - tripStartEvent.timestamp
    const distMeasure = tripStartEvent.gps ? calcDistance(telemetry, tripStartEvent.gps) : null
    const distance = distMeasure ? distMeasure.distance : null
    const points = distMeasure ? distMeasure.points : []
    const violationArray = points.filter(dist => {
      return dist > config.compliance_sla.max_telemetry_distance
    })
    const violation_count = violationArray.length
    const max_violation_dist = violation_count ? Math.min(...violationArray) : null
    const min_violation_dist = violation_count ? Math.max(...violationArray) : null
    const avg_violation_dist = violation_count ? violationArray.reduce((a, b) => a + b) / violationArray.length : null

    const tripData: TripEntry = {
      ...baseTripData,
      duration,
      distance,
      violation_count,
      max_violation_dist,
      min_violation_dist,
      avg_violation_dist,
      events,
      telemetry
    }

    await db.insertTrips(tripData)
    // Delete all processed telemetry data and update cache
    delete telemetryMap[trip_id]
    await cache.writeTripsTelemetry(`${provider_id}:${device_id}`, telemetryMap)

    return trip_id
  }
  throw new Error('TELEMETRY NOT FOUND')
}

export async function tripProcessor() {
  await Promise.all([db.startup(), cache.startup(), getConfig()])
  const curTime = now()
  const tripsMap = await cache.readAllTripsEvents()
  if (!tripsMap) {
    log.info('NO TRIP EVENTS FOUND')
    return
  }
  await Promise.all(
    Object.keys(tripsMap).map(async vehicleID => {
      const [provider_id, device_id] = vehicleID.split(':')
      const tripsEvents = tripsMap[vehicleID]
      const unprocessedTripsEvents = tripsEvents

      const results = await Promise.all(
        Object.keys(tripsEvents).map(tripID => {
          try {
            return processTrip(provider_id, device_id, tripID, tripsEvents[tripID], curTime)
          } catch (err) {
            return err
          }
        })
      )

      results.map(response => {
        if (isUUID(response) && unprocessedTripsEvents[response]) delete unprocessedTripsEvents[response]
      })

      // Update or clear cache
      if (Object.keys(unprocessedTripsEvents).length) return cache.writeTripsEvents(vehicleID, unprocessedTripsEvents)
      return cache.deleteTripsEvents(vehicleID)
    })
  )
}
