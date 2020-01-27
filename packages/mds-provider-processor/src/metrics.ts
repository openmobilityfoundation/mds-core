import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import {
  RIGHT_OF_WAY_STATUSES,
  VehicleCountMetricObj,
  MetricCount,
  LateMetricObj,
  VEHICLE_METRIC_EVENT,
  VEHICLE_EVENT,
  VEHICLE_EVENTS,
  VEHICLE_TYPE,
  UUID,
  Timestamp
} from '@mds-core/mds-types'
import { getConfig } from './configuration'

async function calcEventCounts(
  providerID: UUID,
  vehicleType: VEHICLE_TYPE,
  startTime: Timestamp,
  endTime: Timestamp
): Promise<{ [S in VEHICLE_METRIC_EVENT]: number }> {
  const events = await db.getStates(providerID, vehicleType, startTime, endTime)
  const eventCounts: { [S in VEHICLE_EVENT]: number } = {
    service_start: 0,
    provider_drop_off: 0,
    trip_end: 0,
    cancel_reservation: 0,
    reserve: 0,
    service_end: 0,
    trip_start: 0,
    trip_enter: 0,
    trip_leave: 0,
    register: 0,
    provider_pick_up: 0,
    agency_drop_off: 0,
    deregister: 0,
    agency_pick_up: 0
  }
  Object.keys(eventCounts).map(eventType => {
    eventCounts[eventType as VEHICLE_EVENT] = events.filter(event => {
      return event.event_type === eventType
    }).length
  })
  const telemetryCount = events.filter(event => {
    return event.type === `telemetry`
  }).length
  return { ...eventCounts, telemetry: telemetryCount }
}

async function calcVehicleCounts(
  providerID: UUID,
  vehicleType: VEHICLE_TYPE,
  startTime: Timestamp,
  endTime: Timestamp
): Promise<VehicleCountMetricObj> {
  /* Calculate total number of registered vehicles at start of bin */
  const registeredVehicles = await cache.readKeys('device:*:device')
  const registeredCount = registeredVehicles?.length ?? 0

  const events = await db.getStates(providerID, vehicleType, startTime, endTime)
  const histRegistered = events.filter(event => {
    return event.event_type === VEHICLE_EVENTS.register
  }).length
  const histDeregistered = events.filter(event => {
    return event.event_type === VEHICLE_EVENTS.deregister
  }).length
  const registeredLastHour = histRegistered - histDeregistered
  const registered = registeredCount + registeredLastHour

  /*
  Calculate total number of vehicle in Right of way
  TODO: 48 hour filtering
  */
  const stateCache = await cache.readAllDeviceStates()
  const deployed = stateCache
    ? Object.values(stateCache).filter(vehicle => {
        return (
          vehicle.provider_id === providerID &&
          vehicle.vehicle_type === vehicleType &&
          RIGHT_OF_WAY_STATUSES.includes(String(vehicle.state))
        )
      }).length
    : null

  const dead = null // TODO: Q1 scoped metric
  return { registered, deployed, dead }
}

async function calcTripCount(
  providerID: UUID,
  vehicleType: VEHICLE_TYPE,
  startTime: Timestamp,
  endTime: Timestamp
): Promise<number> {
  const [tripCount] = await db.getTripCount(providerID, vehicleType, startTime, endTime)
  return tripCount.count
}

async function calcVehicleTripCount(
  providerID: UUID,
  vehicleType: VEHICLE_TYPE,
  startTime: Timestamp,
  endTime: Timestamp
): Promise<{ [x: number]: number } | null> {
  const maxTrips = 5
  const tripCountArray = new Array(maxTrips + 1).fill(0)

  const stateCache = await cache.readAllDeviceStates()
  if (!stateCache) {
    return null
  }
  await Promise.all(
    Object.values(stateCache)
      .filter(vehicle => {
        return vehicle.provider_id === providerID && vehicle.vehicle_type === vehicleType
      })
      .map(async vehicle => {
        const tripCount = await db.getVehicleTripCount(vehicle.device_id, startTime, endTime)
        const tripCountIndex = tripCount[0].count
        if (tripCountIndex >= maxTrips) {
          tripCountArray[maxTrips] += 1
        } else {
          tripCountArray[tripCountIndex] += 1
        }
      })
  )
  return { ...tripCountArray }
}

async function calcLateEventCount(
  providerID: UUID,
  vehicleType: VEHICLE_TYPE,
  startTime: Timestamp,
  endTime: Timestamp
): Promise<LateMetricObj> {
  const config = await getConfig()
  const startEndList = await db.getLateEventCount(
    providerID,
    vehicleType,
    [VEHICLE_EVENTS.trip_start, VEHICLE_EVENTS.trip_end],
    config.compliance_sla.max_start_end_time,
    startTime,
    endTime
  )
  const enterLeaveList = await db.getLateEventCount(
    providerID,
    vehicleType,
    [VEHICLE_EVENTS.trip_enter, VEHICLE_EVENTS.trip_leave],
    config.compliance_sla.max_enter_leave_time,
    startTime,
    endTime
  )
  const telemetryList = await db.getLateTelemetryCount(
    providerID,
    vehicleType,
    config.compliance_sla.max_telemetry_time,
    startTime,
    endTime
  )

  const start_end: MetricCount = {
    count: startEndList[0].count,
    min: startEndList[0].min,
    max: startEndList[0].max,
    average: startEndList[0].average
  }
  const enter_leave: MetricCount = {
    count: enterLeaveList[0].count,
    min: enterLeaveList[0].min,
    max: enterLeaveList[0].max,
    average: enterLeaveList[0].average
  }
  const telemetry: MetricCount = {
    count: telemetryList[0].count,
    min: telemetryList[0].min,
    max: telemetryList[0].max,
    average: telemetryList[0].average
  }

  return { start_end, enter_leave, telemetry }
}

async function calcTelemDistViolationCount(
  providerID: UUID,
  vehicleType: VEHICLE_TYPE,
  startTime: Timestamp,
  endTime: Timestamp
): Promise<MetricCount> {
  /* Calculating for trips that ended 24 hours ago in bin size */
  const trips = await db.getTrips(providerID, vehicleType, startTime, endTime)

  const countArray = trips
    .map(trip => {
      return trip.violation_count
    })
    .filter(e => !!e) as number[]
  const avgArray = trips
    .map(trip => {
      return trip.avg_violation_dist
    })
    .filter(e => !!e) as number[]
  const maxArray = trips
    .map(trip => {
      return trip.max_violation_dist
    })
    .filter(e => !!e) as number[]
  const minArray = trips
    .map(trip => {
      return trip.min_violation_dist
    })
    .filter(e => !!e) as number[]

  const telemViolations: MetricCount =
    countArray.length > 0
      ? {
          count: countArray.reduce((a, b) => a + b, 0),
          min: Math.min(...minArray),
          max: Math.max(...maxArray),
          average: avgArray.reduce((a, b) => a + b, 0) / avgArray.length
        }
      : { count: 0, min: null, max: null, average: null }
  return telemViolations
}

export = {
  calcEventCounts,
  calcVehicleCounts,
  calcTripCount,
  calcVehicleTripCount,
  calcLateEventCount,
  calcTelemDistViolationCount
}
