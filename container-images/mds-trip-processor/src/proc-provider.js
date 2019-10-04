let { data_handler } = require('./proc.js')
let { insert, runQuery } = require('../util/db')
let { hset, hget, hgetall, hdel } = require('../util/cache')
let { add } = require('../util/stream')

let { calcTotalDist } = require('./geo/geo')

const log = require('loglevel')

/*
    Provider processor api that runs inside a Kubernetes pod, activated via cron job.
    Aggregates trips/event data at a set interval. Provider cache is cleaned as data
    is processed.

    The following postgres tables are updated as data is processed:

        REPORTS_PROVIDERS:
          PRIMARY KEY = (provider_id, timestamp)
          VALUES = trip_data
*/
async function provider_handler() {
  await data_handler('provider', async function(type, data) {
    provider_aggregator()
  })
}

async function provider_aggregator() {
  let providers = await hgetall('provider:state')
  for (let id in providers) {
    let provider = JSON.parse(providers[id])
    let provider_processed = await process_provider(id, provider)
    if (provider_processed) {
      log.info('PROVIDER PROCESSED')
      await hdel('provider:state', id)
    } else {
      log.info('PROVIDER NOT PROCESSED')
    }
  }
}

async function calcCapacity(id) {
  // let query = `SELECT count(*) FROM reports_device_states d1 WHERE provider_id = ${id} AND state IN ('available', 'unavailable') AND timestamp = (SELECT MAX(timestamp) FROM reports_device_states d2 WHERE d1.device_id = d2.device_id) ORDER BY device_id, timestamp;`
  return 100
}

async function calcDeadDevices(id) {
  return 0
}

async function process_provider(provider_id, data) {
  /*
    Add provider metadata into PG database

    Examples:

        1) Deployment capcity snapshot
        2) Number of out of order events
        3) Number of invalid events
        4) Number of duplicate events
        5) 0 charge device snapshot

    These metrics should be computed here on an interval basis rather than being event triggered
  */

  // Construct provider metadata
  log.info(data)
  let provider_data = {
    provider_id: provider_id,
    timestamp: new Date().getTime(),
    cap_count: null,
    dead_count: null,
    invalid_count: data.invalidEvents.length,
    duplicate_count: data.duplicateEvents.length,
    ooo_count: data.outOfOrderEvents.length
  }

  // Calculate provider metrics
  let capacity = await calcCapacity(provider_id)
  provider_data.cap_count = capacity
  let dead_device_cnt = await calcDeadDevices(provider_id)
  provider_data.dead_count = dead_device_cnt

  log.info(provider_data)

  // Insert into PG DB and stream
  log.info('INSERT')
  try {
    await insert('providers', provider_data)
  } catch (err) {
    console.log(err)
    return false
  }
  log.info('stream')
  try {
    await add('trips', 'mds.processed.provider', provider_data)
  } catch (err) {
    console.log(err)
    return false
  }
  return true
}

module.exports = {
  provider_handler
}
