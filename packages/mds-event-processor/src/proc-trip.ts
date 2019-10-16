import { data_handler } from './proc.js'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import stream from '@mds-core/mds-stream'

let { calcTotalDist } = require('./geo/geo')

import log from 'loglevel'

/*
    Trip processor api that runs inside a Kubernetes pod, activated via cron job.
    Aggregates event/telemety data into binned trips at a set interval. As trips
    are processed caches are cleaned.

    Processed trips are added to a postgres table:

        REPORTS_DEVICE_TRIPS:
          PRIMARY KEY = (provider_id, device_id, trip_id)
          VALUES = trip_data
*/
async function trip_handler() {
  await data_handler('trip', async function(type: any, data: any) {
    trip_aggregator()
  })
}

async function trip_aggregator() {
  let all_trips = await cache.hgetall('trip:state')
  for (let id in all_trips) {
    let [provider_id, device_id] = id.split(':')
    let device_trips = JSON.parse(all_trips[id])
    let unprocessed_trips = device_trips
    for (let trip_id in device_trips) {
      let trip_processed = await process_trip(provider_id, device_id, trip_id, device_trips[trip_id])
      if (trip_processed) {
        log.info('TRIP PROCESSED')
        delete unprocessed_trips[trip_id]
      }
    }
    if (Object.keys(unprocessed_trips).length) {
      // If not all trips were processed set cache to current state of unprocessed trips
      log.info('PROCESSED SOME TRIPS')
      await cache.hset('trip:state', id, JSON.stringify(unprocessed_trips))
    } else {
      // Else if all were processed delete entry from cache
      log.info('PROCESSED ALL TRIPS')
      await cache.hdel('trip:state', id)
    }
  }
}

function calcTotalTime(telemetry: { [x: string]: { [x: string]: { timestamp: any } } }, start_time: any) {
  /*
    Not currently used, but allows tracking of time between individual telemetry/event points
  */
  let temp_time = start_time
  let count = 0
  for (let n in telemetry) {
    for (let m in telemetry[n]) {
      count += telemetry[n][m].timestamp - temp_time
      temp_time = telemetry[n][m].timestamp
    }
  }
  return count
}

async function process_trip(
  provider_id: string,
  device_id: string,
  trip_id: string,
  trip_events: { timestamp: any; event: any; event_type_resaon: any; service_area_id: any; district: any; gps: any }[]
) {
  /*
    Add telemetry and meta data into database when a trip ends

    Examples:

        1) trip duration
        2) trip length

    We must compute these metrics here due to the potential of up to 24hr delay of telemetry data
  */

  // Validation steps
  if (trip_events.length < 2) {
    return false
  }

  // Process anything where the last timestamp is more than 24 hours old
  trip_events.sort(function(a: { timestamp: number }, b: { timestamp: number }) {
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
    end_time: trip_end_info.timestamp,
    start_district: trip_start_info.district,
    end_district: trip_end_info.district,
    duration: 0, // in milliseconds
    distance: 0, // default in miles
    telemetry: Array()
  }

  // Get trip telemetry data
  let trip_telemetry = JSON.parse(await cache.hget('device:' + provider_id + ':' + device_id + ':trips', trip_id))
  // Separate telemetry by trip events
  if (trip_telemetry && trip_telemetry.length > 0) {
    log.info('Parsing telemtry data')
    for (let event_index = 0; event_index < trip_events.length - 1; event_index++) {
      let start_time = trip_events[event_index].timestamp
      let end_time = trip_events[event_index + 1].timestamp
      let trip_segment = trip_telemetry.filter(
        (telemetry_point: { timestamp: number }) =>
          telemetry_point.timestamp >= start_time && telemetry_point.timestamp <= end_time
      )
      trip_segment.sort(function(a: { timestamp: number }, b: { timestamp: number }) {
        return a.timestamp - b.timestamp
      })
      trip_data.telemetry.push(trip_segment)
    }
  }
  // If no telemtry data was found
  else {
    log.info('No telemtry found')
  }

  // Calculate trip metrics
  // Must calculate with trip since telemetry is delayed by up to 24 hrs
  let total_time = trip_end_info.timestamp - trip_start_info.timestamp
  trip_data.duration = total_time
  let total_distance = calcTotalDist(trip_data.telemetry, trip_start_info.gps)
  trip_data.distance = total_distance

  // Insert into PG DB and stream
  log.info('INSERT')
  try {
    await db.insert('trips', trip_data)
  } catch (err) {
    console.log(err)
  }
  log.info('stream')
  try {
    await stream.writeCloudEvent('mds.processed.trip', JSON.stringify(trip_data))
  } catch (err) {
    console.log(err)
  }
  // Delete all processed telemetry data from cache
  log.info('DELETE')
  try {
    await cache.hdel('device:' + provider_id + ':' + device_id + ':trips', trip_id)
  } catch (err) {
    console.log(err)
  }

  return true
}

export { trip_handler }
