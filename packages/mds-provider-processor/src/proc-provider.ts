import { data_handler } from "./proc"
import db from "@mds-core/mds-db"
import cache from "@mds-core/mds-cache"
import stream from "@mds-core/mds-stream"
import metric from "./metrics"
import config from "./config"

//TODO: import from shared file
interface MetricsTableRow {
  /** Timestamp for start of bin (currently houry bins). */
  // WAS: `timestamp`
  start_time: number // TODO: really type `Timestamp`
  /** Bin size. */
  // TODO: new column
  bin_size: "hour" | "day"
  /** Geography this row applies to.  `null` = the entire organization. */
  geography: null | string // TODO: May be geography 'name', may be 'id'. ???
  /** Serice provider id */
  provider_id: string // TODO: really type `UUID`
  /** Vehicle type. */
  vehicle_type: "scooter" | "bicycle" // TODO: is there already a type for this in MDS?
  /** Number of events registered within the bin, by type. */
  event_counts: {
    service_start: number
    user_drop_off: number
    provider_drop_off: number
    trip_end: number
    cancel_reservation: number
    reserve: number
    service_end: number
    // ----- TODO: add telemetry event count
    telemetry: number
    trip_start: number
    trip_enter: number
    trip_leave: number
    register: number
    provider_pick_up: number
    agency_drop_off: number
    default: number
    deregister: number
    agency_pick_up: number
  }
  vehicle_counts: {
    /** Total number of registered vehicles at start of bin. */
    // WAS: `registered`
    registered: number
    /** Total number of vehicles in the right-of-way at start of bin (available, reserved, trip). */
    // WAS: `cap_count`
    deployed: number
    /** Number of vehicles in the right-fo-way with 0 charge at start of bin. */
    // WAS: `dead_count`
    dead: number
  }
  /** Number of trips in region, derived from distinct trip ids. */
  trip_count: number
  /** Number of vehicles with: [0 trips, 1 trip, 2 trips, ...] during bin. */
  // WAS: `trips_count`
  vehicle_trips_count: string
  /** Number of events which out of compliance with time SLA. */
  // TODO:  break into object with this binning, other event types not important. (?)
  // WAS: `late_event_count`
  event_time_violations: {
    /** Number of trip_start and trip_end events out of compliance with time SLA. */
    start_end: {
      /** Total number of events out of SLA compliance during bin. */
      count: number
      /** Minimum time value recorded during bin. */
      min: number
      /** Maximum time value recorded during bin. */
      max: number
      /** Average time value for all events during bin. */
      average: number
    }
    /** Number of trip_enter and trip_leave events out of compliance with time SLA. */
    enter_leave: { count: number; min: number; max: number; average: number }
    /** Number of telemetry events out of compliance with time SLA. */
    telemetry: { count: number; min: number; max: number; average: number }
  }
  /** Number of telemetry events out of compliance with distance SLA. */
  // WAS: `bad_telem_count`
  telemetry_distance_violations: {
    /** Total number of events out of SLA compliance during bin. */
    count: number
    /** Minimum distance value recorded during bin. */
    min: number
    /** Maximum distance value recorded during bin. */
    max: number
    /** Average distance value for all events during bin. */
    average: number
  }
  /** Number of event anomalies. */
  // TODO:  break into object like so
  bad_events: {
    /** Number of invalid events (not matching event state machine). */
    // WAS: `invalid_count`
    invalid_count: number
    /** Number of duplicate events submitted. */
    // WAS: `duplicate_count`
    duplicate_count: number
    /** Number of out-of-order events submitted (according to state machine). */
    // WAS: `ooo_count`
    out_of_order_count: number
  }
  /** SLA values used in these calculations, as of start of bin. */
  // TODO:  break into object like so:
  sla: {
    /** Maximum number of deployed vehicles for provider. Comes from Policy rules. */
    // Typical SLA: 500-2000 vehicles
    max_vehicle_cap: number
    /** Minimum number of registered vehicles for provider. */
    // Typical SLA: 100 vehicles
    min_registered: number
    /** Minumum number of trip_start events. */
    // Typical SLA: 100 events???
    // TODO: per day???
    min_trip_start_count: number
    /** Minumum number of trip_end events. */
    // Typical SLA: 100 events???
    // TODO: per day???
    min_trip_end_count: number
    /** Minumum number of telemetry events. */
    // Typical SLA: 1000 events???
    // TODO: per day???
    min_telemetry_count: number
    /** Maximum time between trip_start or trip_end event and submission to server. */
    // Typical SLA: 30 seconds
    // TODO: per day???
    max_start_end_time: number
    /** Maximum time between trip_enter or trip_leave event and submission to server. */
    // Typical SLA: 30 seconds
    max_enter_leave_time: number
    /** Maximum time between telemetry event and submission to server. */
    // Typical SLA: 1680 seconds
    max_telemetry_time: number
    /** Maximum distance between telemetry events when on-trip. */
    // Typical SLA: 100 meters
    max_telemetry_distance: number
  }
}

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
  await data_handler("provider", async function(type: any, data: any) {
    provider_aggregator()
  })
}

async function provider_aggregator() {
  let providers = await cache.hgetall("provider:state")
  for (let id in providers) {
    let provider = JSON.parse(providers[id])
    let provider_processed = await process_provider(id, provider)
    if (provider_processed) {
      console.log("PROVIDER PROCESSED")
      await cache.hdel("provider:state", id)
    } else {
      console.log("PROVIDER NOT PROCESSED")
    }
  }
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

  let provider_data = <MetricsTableRow>{}
  provider_data.start_time = new Date().getTime() - 3600000
  provider_data.bin_size = "hour"
  provider_data.geography = null
  provider_data.provider_id = provider_id
  provider_data.vehicle_type = "scooter"
  provider_data.event_counts = await metric.calcEventCounts(provider_id)
  provider_data.vehicle_counts = await metric.calcVehicleCounts(provider_id)
  provider_data.trip_count = await metric.calcTripCount(provider_id)
  provider_data.vehicle_trips_count = await metric.calcVehicleTripCount(
    provider_id
  )
  provider_data.event_time_violations = await metric.calcLateEventCount(
    provider_id
  )
  provider_data.telemetry_distance_violations = await metric.calcTelemDistViolationCount(
    provider_id
  )
  provider_data.bad_events = {
    invalid_count: data.invalidEvents.length,
    duplicate_count: data.duplicateEvents.length,
    out_of_order_count: data.outOfOrderEvents.length
  }
  provider_data.sla = {
    max_vehicle_cap: 1600, //TODO: grab from PCE
    min_registered: config.compliance_sla.min_registered,
    min_trip_start_count: config.compliance_sla.min_trip_start_count,
    min_trip_end_count: config.compliance_sla.min_trip_end_count,
    min_telemetry_count: config.compliance_sla.min_telemetry_count,
    max_start_end_time: config.compliance_sla.max_start_end_time,
    max_enter_leave_time: config.compliance_sla.max_enter_leave_time,
    max_telemetry_time: config.compliance_sla.max_telemetry_time,
    max_telemetry_distance: config.compliance_sla.max_telemetry_distance
  }
  console.log(provider_data)
  console.log(typeof provider_data.vehicle_trips_count)
  // Insert into PG DB and stream
  console.log("INSERT")
  try {
    await db.insert("reports_providers", provider_data)
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
