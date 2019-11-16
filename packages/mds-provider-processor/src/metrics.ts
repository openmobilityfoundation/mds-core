import db from "@mds-core/mds-db"
import cache from "@mds-core/mds-cache"
//new Date().getTime().toLocaleString("en-US", {timeZone: "America/New_York"})
interface DeviceState {
  type: any
  utc_epoch: any
  date_timestamp: any
  device_id: any
  provider_id: any
  state: any
  event_type: any
  event_type_reason: any
  trip_id: any
  service_area_id: any
  gps: any
  battery: any
  annotation_version: any
  annotation: any
  time_recorded: any
  last_state_data: any
}

let events_def = {
  service_start: "available",
  user_drop_off: "available",
  provider_drop_off: "available",
  trip_end: "available",
  cancel_reservation: "available",
  reserve: "reserved",
  service_end: "unavailable",
  trip_start: "trip",
  trip_enter: "trip",
  trip_leave: "elsewhere",
  register: "removed",
  provider_pick_up: "removed",
  agency_drop_off: "removed",
  default: "removed",
  deregister: "inactive",
  agency_pick_up: "inactive"
}

async function calcEventCounts(id: any) {
  let events = await db.getStates(id)
  let event_counts: any = {
    service_start: null,
    user_drop_off: null,
    provider_drop_off: null,
    trip_end: null,
    cancel_reservation: null,
    reserve: null,
    service_end: null,
    trip_start: null,
    trip_enter: null,
    trip_leave: null,
    register: null,
    provider_pick_up: null,
    agency_drop_off: null,
    default: null,
    deregister: null,
    agency_pick_up: null,
    telemetry: null
  }

  for (let event_type in events_def) {
    event_counts[event_type] = events.filter(function(events: DeviceState) {
      return events.event_type == event_type
    }).length
  }
  return event_counts
}

async function calcVehicleCounts(id: any) {
  let events = await db.getStates(id)
  let rs = await cache.hgetall("device:state")
  let recent_states = Object.values(rs)

  let vehicle_counts: any = {
    registered: null,
    deployed: null,
    dead: null
  }
  //** Calculate total number of registered vehicles at start of bin */
  let hist_registered = events.filter(function(events: DeviceState) {
    return events.event_type === "register"
  }).length
  let hist_deregistered = events.filter(function(events: DeviceState) {
    return events.event_type === "deregister"
  }).length
  let curr_registered = hist_registered - hist_deregistered
  vehicle_counts.registered = curr_registered

  /** Calculate total number of vehicle in Right of way */
  // Using cache for most recent event
  //TODO: 48 hour filtering
  let count = 0
  for (let i in recent_states) {
    let s = JSON.parse(recent_states[i])
    if (
      s.state === "available" ||
      s.state === "trip" ||
      s.state === "reserved" ||
      s.state === "unavailable"
    ) {
      count += 1
    }
  }
  vehicle_counts.deployed = count
  //vehicle_counts.deployed = recent_states.filter(function(recent_states: any) {
  //  return recent_states.state === "available"
  //}).length

  return vehicle_counts
}

async function calcTripCount(id: any) {
  let now = new Date().getTime()
  let last_hour = now - 3600000
  let trip_count = await db.getTripCount(id, last_hour, now)
  return trip_count[0].count
}

async function calcVehicleTripCount(id: any) {
  let max_trips = 5
  let trip_count_array = new Array(max_trips + 1).fill(0)
  let rs = await cache.hgetall("device:state")
  let vehicles = Object.keys(rs)
  let now = new Date().getTime()
  let last_hour = now - 3600000
  //TODO: migrate form inefficient loop once SET is created in cache
  for (let i in vehicles) {
    let [provider_id, device_id] = vehicles[i].split(":")
    if (provider_id === id) {
      let trip_count = await db.getVehicleTripCount(device_id, last_hour, now)
      let trip_count_index = trip_count[0].count
      if (trip_count_index >= max_trips) {
        trip_count_array[max_trips] += 1
      } else {
        trip_count_array[trip_count_index] += 1
      }
    }
  }
  return String(trip_count_array)
}

async function calcLateEventCount(id: any) {
  let late_counts: any = {
    start_end: { count: 0, min: 0, max: 0, average: 0 },
    enter_leave: { count: 0, min: 0, max: 0, average: 0 },
    telemetry: { count: 0, min: 0, max: 0, average: 0 }
  }
  let now = new Date().getTime()
  let last_hour = now - 3600000
  let late_start_end_count = await db.getLateEventCount(
    id,
    "('trip_start', 'trip_end')",
    last_hour,
    now
  )
  let late_enter_leave_count = await db.getLateEventCount(
    id,
    "('trip_enter', 'trip_leave')",
    last_hour,
    now
  )
  let late_telemetry_count = await db.getLateEventCount(
    id,
    "('telemetry')",
    last_hour,
    now
  )

  late_counts.start_end.count = late_start_end_count[0].count
  late_counts.enter_leave.count = late_enter_leave_count[0].count
  late_counts.telemetry.count = late_telemetry_count[0].count
  return late_counts
}

async function calcTelemDistViolationCount(id: any) {
  let telem_violations: any = {
    count: 0,
    min: 0,
    max: 0,
    average: 0
  }
  //calculating for trips that ended 24 hours ago in an hour bin
  let now_yesterday = new Date().getTime() - 86400000
  let last_hour_yesterday = now_yesterday - 90000000
  let trips = await db.getTrips(id, last_hour_yesterday, now_yesterday)

  let violation_count_array = trips.map(function(trips: any) {
    return trips.violation_count
  })
  let telem_avg_array = trips.map(function(trip: any) {
    return trip.avg_violation_dist
  })
  let telem_max_array = trips.map(function(trip: any) {
    return trip.max_violation_dist
  })
  let telem_min_array = trips.map(function(trip: any) {
    return trip.min_violation_dist
  })

  if (violation_count_array.length > 0) {
    let add = (a: number, b: number) => a + b
    telem_violations.count = violation_count_array.reduce(add)
    telem_violations.average =
      telem_avg_array.reduce(add) / telem_avg_array.length
    telem_violations.min = Math.min(...telem_min_array)
    telem_violations.max = Math.max(...telem_max_array)
  }

  return telem_violations
}

export = {
  calcEventCounts,
  calcVehicleCounts,
  calcTripCount,
  calcVehicleTripCount,
  calcLateEventCount,
  calcTelemDistViolationCount
}
