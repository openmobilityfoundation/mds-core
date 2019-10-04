/* CHANGES:
-helper function
-altered schema
  -added trip_id to each evetn
  -added full prev state table
-made cache device:states field (deviceID -> deviceID:ProviderID)
-added gps and event_type_reason to trip:state
  -on event is a telemtry also sent?
-telem state always in trip -> null
-old assumption that all tripIds belonged to trip
-matching on firsst trip event which is not necesarily a trip start
-added annotation data to trip:state cache
*/

let { data_handler } = require('./proc.js')

let { insert } = require('../util/db')
let { hget, hset } = require('../util/cache')
let { add } = require('../util/stream')

let { moved } = require('./geo/geo')
let { getAnnotationData, getAnnotationVersion } = require('./annotation')

const log = require('loglevel')
const { VEHICLE_STATUSES, EVENT_STATUS_MAP } = require('@mds-core/mds-types')

async function event_handler() {
  await data_handler('event', async function(type, data) {
    // log.info(data)
    log.info(type)
    return processRaw(type, data) // type, data
  })
}

// Check validity of last state
function checkDupPrevState(data, device_last_state) {
  if (device_last_state) {
    device_last_state = JSON.parse(device_last_state)
    // if duplicate, stop and don't do anything else
    if (device_last_state.timestamp === data.timestamp) {
      if (data.type === 'event') {
        if (
          device_last_state.type === data.type &&
          device_last_state.sub_state === data.event_type
        ) {
          return false
        }
      } else if (data.type === 'telemetry') {
        return false
      }
    }
  }
  return true
}

function _objectWithoutProperties(obj: { [x: string]: any }, keys: string[]) {
  let target = {}
  for (let i in obj) {
    if (keys.indexOf(i) >= 0) continue
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue
    target[i] = obj[i]
  }
  return target
}

// Process each telemetry / event data coming in
async function processRaw(type, data) {
  // Convert "mds.event" to event or "mds.telemetry" to telemetry
  let ping_type = type.substring(type.lastIndexOf('.') + 1)
  // Construct global state
  let device_state = {
    type: ping_type,
    timestamp: data.timestamp,
    device_id: data.device_id,
    provider_id: data.provider_id,
    state: null,
    event_type: null,
    event_type_reason: null,
    trip_id: null,
    service_area_id: null,
    gps: null,
    battery: null,
    annotation_version: null,
    annotation: null,
    time_recorded: data.recorded,
    last_event_data: {}
  }

  let device_last_state = await hget(
    'device:state',
    data.provider_id + ':' + data.device_id
  )

  // Check if duplicate
  if (!checkDupPrevState(data, device_last_state)) {
    log.info('DUPLICATE')
    return null
  }

  // TODO: PULL KEY METRICS HERE (e.g. Previous State time/distance/type)
  device_state.last_event_data = _objectWithoutProperties(
    JSON.parse(device_last_state),
    ['device_id', 'provider_id', 'last_event_data']
  )

  if (typeof data.gps === 'undefined') {
    device_state.gps = data.telemetry.gps
    device_state.battery = data.telemetry.charge
  } else {
    device_state.gps = data.gps
    device_state.battery = data.charge
  }

  // TODO: actually calculate this with PostGIS
  device_state.annotation_version = getAnnotationVersion()
  device_state.annotation = getAnnotationData(device_state.gps)

  // Construct fields specific to telemtry or events
  switch (ping_type) {
    case 'event':
      device_state.service_area_id = data.service_area_id
      device_state.event_type = data.event_type
      device_state.event_type_reason = data.event_type_reason
      device_state.trip_id = data.trip_id
      // Set state
      try {
        device_state.state = EVENT_STATUS_MAP[data.event_type]
      } catch (err) {
        console.log(err)
        device_state.state = null
      }

      // Take necessary steps on event trasitions
      switch (data.event_type) {
        case 'trip_start':
          processTripEvent(device_state)
          break
        case 'trip_enter':
        case 'trip_leave':
        case 'trip_end':
          processTripEvent(device_state)
          break
      }
      break

    case 'telemetry':
      setTimeout(function() {
        processTripTelemetry(device_state)
      }, 5000)
      break
  }

  // Only update cache with most recent event
  if (
    !device_last_state ||
    device_last_state.timestamp < device_state.timestamp ||
    (device_last_state.timestamp === device_state.timestamp &&
      device_state.event_type === 'event' &&
      device_state.trip_id)
  ) {
    await hset(
      'device:state',
      data.provider_id + ':' + data.device_id,
      JSON.stringify(device_state)
    )
  }

  // log.info(device_state)
  await insert('device_states', device_state)
  await add('events', 'mds.processed.event', device_state)
  // emit
  // log.info('PROCESSED')
  return device_state
}

// For each event related to trips, add it to the redis cache tracking trips
async function processTripEvent(device_state) {
  let trip_id = device_state.trip_id
  let district = device_state.annotation.geo.areas.length
    ? device_state.annotation.geo.areas[0].id
    : null
  let trip_event_data = {
    timestamp: device_state.timestamp,
    event: device_state.event_type,
    event_type_resaon: device_state.event_type_reason,
    district: district
  }

  let cur_state = await hget(
    'trip:state',
    device_state.provider_id + ':' + device_state.device_id
  )

  if (!cur_state) {
    cur_state = {}
  } else {
    cur_state = JSON.parse(cur_state)
  }
  if (!cur_state[trip_id]) {
    cur_state[trip_id] = []
  }

  cur_state[trip_id].push(trip_event_data)

  await hset(
    'trip:state',
    device_state.provider_id + ':' + device_state.device_id,
    JSON.stringify(cur_state)
  )
  await processTripTelemetry(device_state)
  add('events', 'mds.trip.event', trip_event_data)
}

// For each telemetry/event post update cache with trip telemetry
async function processTripTelemetry(device_state) {
  let trip_id
  // Check if accosiated to an event or telemetry post
  if (device_state.type === 'telemetry') {
    let trips = await hget(
      'trip:state',
      device_state.provider_id + ':' + device_state.device_id
    )
    // Requires trip start event to match telemetry to tripID
    if (!trips) {
      log.info('NO TRIP DATA FOUND')
      return null
    } else {
      trips = JSON.parse(trips)
      let trip
      let trip_start_time
      // find latest trip whose start time is before current timestamp
      for (let trip_key in trips) {
        trip = trips[trip_key]
        for (let i in trip) {
          if (trip[i].event === 'trip_start') {
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
        log.info('NO TRIPS MATCHED')
        return null
      }
    }
  } else {
    trip_id = device_state.trip_id
  }

  let trip_event_data = {
    timestamp: device_state.timestamp,
    latitude: device_state.gps.lat,
    longitude: device_state.gps.lng,
    annotation_version: device_state.annotation_version,
    annotation: device_state.annotation
  }
  let cur_state = await hget(
    'device:' +
      device_state.provider_id +
      ':' +
      device_state.device_id +
      ':trips',
    trip_id
  )
  if (!cur_state) {
    cur_state = []
  } else {
    cur_state = JSON.parse(cur_state)
  }

  // don't add same telemetry timestamp twice
  if (
    cur_state.filter(
      telemetry => telemetry.timestamp === trip_event_data.timestamp
    ).length === 0
  ) {
    cur_state.push(trip_event_data)
  }
  await hset(
    'device:' +
      device_state.provider_id +
      ':' +
      device_state.device_id +
      ':trips',
    trip_id,
    JSON.stringify(cur_state)
  )
}

module.exports = {
  event_handler
}
