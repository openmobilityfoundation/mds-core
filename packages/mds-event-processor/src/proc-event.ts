import { data_handler } from "./proc"
import db from "@mds-core/mds-db"
import cache from "@mds-core/mds-cache"
import stream from "@mds-core/mds-stream"

import { getAnnotationData, getAnnotationVersion } from "./annotation"
import { EVENT_STATUS_MAP, VEHICLE_EVENT } from "@mds-core/mds-types"

interface State {
  type: any
  timestamp: any
  device_id: any
  provider_id: any
  state: any
  event_type: VEHICLE_EVENT | null
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

function objectWithoutProperties(obj: { [x: string]: any }, keys: string[]) {
  let target: { [x: string]: any } = {}
  for (let i in obj) {
    if (keys.indexOf(i) >= 0) continue
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue
    target[i] = obj[i]
  }
  return target
}

async function checkDupPrevState(
  device_state: State,
  device_last_state: State
) {
  if (device_last_state) {
    if (device_last_state.timestamp === device_state.timestamp) {
      if (device_state.type === "event") {
        if (
          device_last_state.type === device_state.type &&
          device_last_state.event_type === device_state.event_type
        ) {
          return false
        }
      } else if (device_state.type === "telemetry") {
        return false
      }
    }
  }
  return true
}

// TODO: build logic to check valid state transitions
async function stateDiagramCheck(device_state: State) {
  return true
}

async function checkInvalid(device_state: State) {
  if (device_state.type === "event") {
    if (device_state.event_type && !EVENT_STATUS_MAP[device_state.event_type]) {
      return false
    }
    if (!stateDiagramCheck(device_state)) {
      return false
    }
  }
  return true
}

async function checkOutOfOrder(data: any, device_state: State) {
  // Only can check for events given allowable 24hr delay for telemetry
  // Currently only checking if trip events are out of order
  if (device_state.type === "event") {
    if (
      device_state.event_type === "trip_enter" ||
      device_state.event_type === "trip_leave" ||
      device_state.event_type === "trip_end"
    ) {
      let trip_id = data.trip_id
      let cur_state = await cache.hget(
        "trip:state",
        device_state.provider_id + ":" + device_state.device_id
      )
      if (!cur_state) {
        return false
      } else {
        cur_state = JSON.parse(cur_state)
      }
      if (!cur_state[trip_id]) {
        return false
      }
    }
  }
  return true
}

async function qualityCheck(data: any, device_state: State) {
  /*
    Filter to reduce noise and track it at the provider level.
    Main checks include:

      1) duplicate events/telemetry
      2) invalid events
      3) out of order events

    To track provider metrics we update a porvider data cache (provider:state):

      Key: provider_id
      Field Hash keys include:
        duplicateEvents
        invalidEvents
        outOfOrderEvents

  */
  let ps = await cache.hget("provider:state", device_state.provider_id)
  let provider_state: {
    duplicateEvents: any
    invalidEvents: any
    outOfOrderEvents: any
  }
  if (!ps) {
    provider_state = {
      duplicateEvents: [],
      invalidEvents: [],
      outOfOrderEvents: []
    }
  } else {
    provider_state = JSON.parse(ps)
  }

  if (device_state.type === "event" && !data.telemetry) {
    console.log("EVENT MISSING TELEMETRY")
    return false
  }

  // Check if Duplicate event
  if (!checkDupPrevState(device_state, device_state.last_state_data)) {
    console.log("DUPLICATE EVENT")
    provider_state.duplicateEvents.push(device_state)
    return false
  }

  // Check if Invalid event
  if (!checkInvalid(device_state)) {
    console.log("INVALID EVENT")
    provider_state.invalidEvents.push(device_state)
    return false
  }

  // Check if Out of Order event
  if (!checkOutOfOrder(data, device_state)) {
    console.log("OUT OF ORDER EVENT")
    provider_state.outOfOrderEvents.push(device_state)
    return false
  }

  await cache.hset(
    "provider:state",
    device_state.provider_id,
    JSON.stringify(provider_state)
  )
  return true
}

/*
    Event processor api that runs inside a Kubernetes pod.
    Streams cloudevents from mds agency and process them in multiple ways:

        1) quality checks
        2) status changes
        3) trip identification

    Processed events/telemetry are added to various caches keyed as follows:

        1) device:state (latest event/telemetry for a device)
        2) trip:state (events linked to trips of a device)
        3) device:ID:trips (all telemetry linked to all trips of a device)
            - ID is the combination 'provider_id:device_id'

    A Postgres table is also populated to store historical states:

        REPORTS_DEVICE_STATES:
          PRIMARY KEY = (provider_id, device_id, timestamp, type)
          VALUES = device_state
*/
async function event_handler() {
  await data_handler("event", async function(type: any, data: any) {
    console.log(type, data)
    return processRaw(type, data)
  })
}

async function processRaw(type: string, data: any) {
  // Construct device state
  let device_state: any = {
    type: type.substring(type.lastIndexOf(".") + 1),
    utc_epoch: data.timestamp,
    date_timezone: data.timestamp,
    device_id: data.device_id,
    provider_id: data.provider_id,
    state: null,
    event_type: null,
    event_type_reason: null,
    trip_id: null,
    service_area_id: null,
    gps: null,
    battery: null,
    annotation_version: getAnnotationVersion(),
    annotation: null,
    time_recorded: data.recorded,
    last_state_data: {}
  }

  // Get last state of device
  let dls = await cache.hget(
    "device:state",
    data.provider_id + ":" + data.device_id
  )
  if (dls) {
    device_state.last_state_data = objectWithoutProperties(JSON.parse(dls), [
      "device_id",
      "provider_id",
      "last_state_data"
    ])
  }
  // Quality filter events/telemetry
  let quality_check = await qualityCheck(data, device_state)
  if (!quality_check) {
    return null
  }

  /*
  Construct fields specific to telemtry or events.
  Fields specific to events (null for telemetry):
      -event_type
      -event_type_reason
      -trip_id
      -service_area_id
      -state
  */
  switch (device_state.type) {
    case "event":
      device_state.gps = data.telemetry.gps
      device_state.annotation = getAnnotationData(device_state.gps)
      device_state.battery = data.telemetry.charge
      device_state.event_type = data.event_type
      device_state.event_type_reason = data.event_type_reason
      device_state.trip_id = data.trip_id
      device_state.service_area_id = data.service_area_id
      device_state.state = EVENT_STATUS_MAP[data.event_type as VEHICLE_EVENT]

      // Take necessary steps on event trasitions
      switch (data.event_type) {
        case "trip_start":
          processTripEvent(device_state)
          break
        case "trip_enter":
        case "trip_leave":
        case "trip_end":
          processTripEvent(device_state)
          break
      }
      break

    case "telemetry":
      device_state.gps = data.gps
      device_state.annotation = getAnnotationData(device_state.gps)
      device_state.battery = data.charge
      device_state.event_type = "telemetry"
      device_state.state = device_state.last_state_data.state

      setTimeout(function() {
        processTripTelemetry(device_state)
      }, 5000)
      break
  }

  // Only update cache (device:state) with most recent event
  if (
    !dls ||
    device_state.last_state_data.utc_epoch < device_state.utc_epoch ||
    (device_state.last_state_data.utc_epoch === device_state.utc_epoch &&
      device_state.event_type === "event" &&
      device_state.trip_id)
  ) {
    await cache.hset(
      "device:state",
      data.provider_id + ":" + data.device_id,
      JSON.stringify(device_state)
    )
  }

  // Add to PG table (reports_device_states) and stream
  await db.insert("reports_device_states", device_state)
  //await stream.writeCloudEvent('mds.processed.event', JSON.stringify(device_state))
  return device_state
}

async function processTripEvent(device_state: State) {
  /*
    Add events related to a trip to a cache (trip:state)

      Key: 'provider_id:device_id'
      Field Hash keys include:
        timestamp
        event
        event_type_resaon
        service_area_id
        district
        gps
  */
  // Create trip data
  let trip_id = device_state.trip_id
  let district = device_state.annotation.geo.areas.length
    ? device_state.annotation.geo.areas[0].id
    : null
  let trip_event_data = {
    timestamp: device_state.timestamp,
    event: device_state.event_type,
    event_type_resaon: device_state.event_type_reason,
    service_area_id: device_state.service_area_id,
    district: district,
    gps: device_state.gps
  }

  // Append to existing trip or create new
  let cs = await cache.hget(
    "trip:state",
    device_state.provider_id + ":" + device_state.device_id
  )
  let cur_state: {
    [trip_id: string]: {
      timestamp: any
      event: any
      event_type_resaon: any
      service_area_id: any
      district: any
      gps: any
    }[]
  }
  if (cs) {
    cur_state = JSON.parse(cs)
  } else {
    cur_state = {}
  }
  if (!cur_state[trip_id]) {
    cur_state[trip_id] = []
  }
  cur_state[trip_id].push(trip_event_data)

  // Update trip event cache and stream
  await cache.hset(
    "trip:state",
    device_state.provider_id + ":" + device_state.device_id,
    JSON.stringify(cur_state)
  )
  await stream.writeCloudEvent(
    "mds.trip.event",
    JSON.stringify(trip_event_data)
  )

  await processTripTelemetry(device_state)
}

async function processTripTelemetry(device_state: State) {
  /*
    Add telemetry related to a trip to a cache (device:{ID}:trips)

      ID: 'provider_id:device_id'
      Key: trip_id
      Field Hash keys include:
        timestamp
        latitude
        longitude
        annotation_version
        annotation
  */
  let trip_id
  // Check if accosiated to an event or telemetry post
  if (device_state.type === "telemetry") {
    let trip_query = await cache.hget(
      "trip:state",
      device_state.provider_id + ":" + device_state.device_id
    )
    let trips: {
      [trip_id: string]: {
        timestamp: any
        event: any
        event_type_resaon: any
        service_area_id: any
        district: any
        gps: any
      }[]
    }
    // Requires trip start event to match telemetry to tripID
    if (!trip_query) {
      console.log("NO TRIP DATA FOUND")
      return null
    } else {
      trips = JSON.parse(trip_query)
      let trip
      let trip_start_time
      // find latest trip whose start time is before current timestamp
      for (let trip_key in trips) {
        trip = trips[trip_key]
        for (let i in trip) {
          if (trip[i].event === "trip_start") {
            if (
              trip[i].timestamp <= device_state.timestamp &&
              (!trip_start_time || trip_start_time <= trip[i].timestamp)
            ) {
              trip_id = trip_key
              trip_start_time = trip[i].timestamp
            }
          }
        }
      }
      if (!trip_id) {
        console.log("NO TRIPS MATCHED")
        return null
      }
    }
  } else {
    trip_id = device_state.trip_id
  }

  // Construct trip event entry/update
  let trip_event_data: {
    timestamp: any
    latitude: any
    longitude: any
    annotation_version: any
    annotation: any
  }
  trip_event_data = {
    timestamp: device_state.timestamp,
    latitude: device_state.gps.lat,
    longitude: device_state.gps.lng,
    annotation_version: device_state.annotation_version,
    annotation: device_state.annotation
  }

  let cs = await cache.hget(
    "device:" +
      device_state.provider_id +
      ":" +
      device_state.device_id +
      ":trips",
    trip_id
  )
  let cur_state: {
    timestamp: any
    latitude: any
    longitude: any
    annotation_version: any
    annotation: any
  }[]
  if (!cs) {
    cur_state = []
  } else {
    cur_state = JSON.parse(cs)
  }

  // Don't add same telemetry timestamp twice
  if (
    cur_state.filter(state => state.timestamp === trip_event_data.timestamp)
      .length === 0
  ) {
    cur_state.push(trip_event_data)
  }
  await cache.hset(
    "device:" +
      device_state.provider_id +
      ":" +
      device_state.device_id +
      ":trips",
    trip_id,
    JSON.stringify(cur_state)
  )
}

export { event_handler }
