import { data_handler } from './proc'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import stream from '@mds-core/mds-stream'

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
  await data_handler('provider', async function(type: any, data: any) {
    provider_aggregator()
  })
}

async function provider_aggregator() {
  let providers = await cache.hgetall('provider:state')
  for (let id in providers) {
    let provider = JSON.parse(providers[id])
    let provider_processed = await process_provider(id, provider)
    if (provider_processed) {
      console.log('PROVIDER PROCESSED')
      await cache.hdel('provider:state', id)
    } else {
      console.log('PROVIDER NOT PROCESSED')
    }
  }
}

async function calcCapacity(id: any) {
  // let query = `SELECT count(*) FROM reports_device_states d1 WHERE provider_id = ${id} AND state IN ('available', 'unavailable') AND timestamp = (SELECT MAX(timestamp) FROM reports_device_states d2 WHERE d1.device_id = d2.device_id) ORDER BY device_id, timestamp;`
  return 100
}

async function calcDeadDevices(id: any) {
  return 0
}

async function process_provider(provider_id: any, data: any) {
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
  console.log(data)
  let provider_data: any = {
    provider_id: provider_id,
    date_timestamp: new Date().getTime(),
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

  console.log(provider_data)

  // Insert into PG DB and stream
  console.log('INSERT')
  try {
    await db.insert('reports_providers', provider_data)
  } catch (err) {
    console.log(err)
    return false
  }
  /*
  console.log('stream')
  try {
    await stream.writeCloudEvent('mds.processed.provider', JSON.stringify(provider_data))
  } catch (err) {
    console.log(err)
    return false
  }
  */
  return true
}
export { provider_handler }
