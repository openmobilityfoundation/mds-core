let { data_handler } = require('./proc.js')
let { insert } = require('../util/db')
let { hset, hget, hgetall, hdel } = require('../util/cache')
let { add } = require('../util/stream')

const log = require('loglevel')

async function trip_handler() {
  await data_handler('trip', async function(type: any, data: any) {
    trip_aggregator()
  })
}

async function trip_aggregator() {
  let all_trips = await hgetall('trip:state')
  for (let id in all_trips) {
    let [provider_id, device_id] = id.split(':')
    let device_trips = JSON.parse(all_trips[id])
    let unprocessed_trips = device_trips
    for (let trip_id in device_trips) {
      let trip_processed = await process_trip(
        provider_id,
        device_id,
        trip_id,
        device_trips[trip_id]
      )
      if (trip_processed) {
        log.info('TRIP PROCESSED')
        delete unprocessed_trips[trip_id]
      }
    }
    if (Object.keys(unprocessed_trips).length) {
      // If not all trips were processed set cache to current state of unprocessed trips
      log.info('PROCESSED SOME TRIPS')
      await hset('trip:state', id, JSON.stringify(unprocessed_trips))
    } else {
      // Else if all were processed delete entry from cache
      log.info('PROCESSED ALL TRIPS')
      await hdel('trip:state', id)
    }
  }
}

// add telemetry and meta data into database when a trip ends or leaves the region
async function process_trip(
  provider_id: string,
  device_id: string,
  trip_id: string,
  trip_events: { timestamp: any }[]
) {
  // Validation steps
  if (trip_events.length <= 1) {
    return false
  }

  // Process anything where the last timestamp is more than 24 hours old
  trip_events.sort(function(
    a: { timestamp: number },
    b: { timestamp: number }
  ) {
    return a.timestamp - b.timestamp
  })
  let time_range = 24 * 60 * 60 * 1000
  let cur_time = new Date().getTime()
  let latest_time = trip_events[trip_events.length - 1].timestamp
  if (latest_time + time_range > cur_time) {
    return false
  }

  // Get trip metadata
  let trip_start_info = trip_events[0]
  let trip_end_info = trip_events[trip_events.length - 1]
  let trip_data = {
    trip_id: trip_id,
    device_id: device_id,
    provider_id: provider_id,
    start_time: trip_start_info.timestamp,
    start_district: trip_start_info.district,
    end_time: trip_end_info.timestamp,
    end_district: trip_end_info.district,
    total_time: null,
    total_distance: null,
    telemetry: []
  }

  // Get trip telemetry data
  let trip_telemetry = JSON.parse(
    await hget('device:' + provider_id + ':' + device_id + ':trips', trip_id)
  )

  // Separate telemetry by trip events
  if (trip_telemetry && trip_telemetry.length > 0) {
    log.info('Parsing telemtry data')
    for (
      let event_index = 0;
      event_index < trip_events.length - 1;
      event_index++
    ) {
      let start_time = trip_events[event_index].timestamp
      let end_time = trip_events[event_index + 1].timestamp
      let trip_segment = trip_telemetry.filter(
        (telemetry_point: { timestamp: number }) =>
          telemetry_point.timestamp >= start_time &&
          telemetry_point.timestamp <= end_time
      )
      trip_segment.sort(function(
        a: { timestamp: number },
        b: { timestamp: number }
      ) {
        return a.timestamp - b.timestamp
      })
      trip_data.telemetry.push(trip_segment)
    }
  }
  // If no telemtry data was found
  else {
    log.info('No telemtry found')
  }

  // Insert into PG DB and stream
  log.info('INSERT')
  try {
    await insert('trips', trip_data)
  } catch (err) {
    console.log(err)
  }
  log.info('stream')
  try {
    await add('trips', 'mds.processed.trip', trip_data)
  } catch (err) {
    console.log(err)
  }
  // Delete all processed telemetry data from cache
  log.info('DELETE')
  try {
    await hdel('device:' + provider_id + ':' + device_id + ':trips', trip_id)
  } catch (err) {
    console.log(err)
  }

  return true
}

module.exports = {
  trip_handler
}
