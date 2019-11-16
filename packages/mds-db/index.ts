import { VehicleEvent, Device, Telemetry } from "@mds-core/mds-types"
import log from "@mds-core/mds-logger"

import { dropTables, updateSchema } from "./migration"
import { MDSPostgresClient } from "./sql-utils"
import {
  getReadOnlyClient,
  getWriteableClient,
  makeReadOnlyQuery
} from "./client"

import {
  readDeviceByVehicleId,
  readDeviceIds,
  readDevice,
  readDeviceList,
  writeDevice,
  updateDevice,
  wipeDevice,
  getVehicleCountsPerProvider,
  getNumVehiclesRegisteredLast24HoursByProvider
} from "./devices"

import {
  writeEvent,
  readEvent,
  readEvents,
  readEventsForStatusChanges,
  readHistoricalEvents,
  getEventCountsPerProviderSince,
  getEventsLast24HoursPerProvider,
  getNumEventsLast24HoursByProvider,
  getMostRecentEventByProvider,
  readEventsWithTelemetry
} from "./events"

import {
  readPolicies,
  writePolicy,
  readPolicy,
  editPolicy,
  deletePolicy,
  writePolicyMetadata,
  updatePolicyMetadata,
  readBulkPolicyMetadata,
  readSinglePolicyMetadata,
  publishPolicy,
  readRule,
  isPolicyPublished
} from "./policies"

import {
  writeGeographyMetadata,
  updateGeographyMetadata,
  readSingleGeographyMetadata,
  readSingleGeography,
  readBulkGeographyMetadata,
  readGeographies,
  readGeographySummaries,
  writeGeography,
  publishGeography,
  deleteGeography,
  isGeographyPublished,
  editGeography
} from "./geographies"

import {
  readAudit,
  readAudits,
  writeAudit,
  deleteAudit,
  readAuditEvents,
  writeAuditEvent
} from "./audits"

import {
  writeTrips,
  updateTrip,
  readTrips,
  readTripList,
  readTripIds,
  getLatestTripTime,
  getTripEventsLast24HoursByProvider,
  getTripCountsPerProviderSince
} from "./trips"

import {
  readTelemetry,
  writeTelemetry,
  getTelemetryCountsPerProviderSince,
  getMostRecentTelemetryByProvider
} from "./telemetry"

import {
  writeStatusChanges,
  readStatusChanges,
  readUnprocessedStatusChangeEvents,
  getLatestStatusChangeTime
} from "./status_changes"

import schema from "./schema"
import { TABLE_NAME } from "./schema"

async function initialize() {
  const client: MDSPostgresClient = await getWriteableClient()
  await dropTables(client)
  await updateSchema(client)
  await getReadOnlyClient()
  return "postgres"
}

function commaize(array: ReadonlyArray<string>, quote = `'`, join = ","): any {
  return array.map((val: any) => `${stringify(val, quote)}`).join(join)
}

function db_time(time: any): any {
  let date_time = parseInt(time) ? parseInt(time) : time
  return (
    new Date(date_time)
      .toISOString()
      .replace("T", " ")
      .substr(0, 23) + "UTC"
  )
}

function stringify(data: any, quote: any, nested = false): any {
  if (!data && data !== 0) {
    return `NULL`
  } else if (Array.isArray(data)) {
    // get type
    let type = ""
    let first = [data]
    while (first.length > 0 && Array.isArray(first[0])) {
      type = "[]" + type
      first = first[0]
    }

    first = first[0]
    switch (typeof first) {
      case "object":
        type = "JSON" + type
        break
      case "string":
        type = "varchar(31)" + type
        break
      default:
        type = typeof first + type
    }

    let commaized_content = commaize(
      data.map(data_element => stringify(data_element, `'`, true)),
      ``
    )
    let cast = !nested && type !== "[]"
    return `${cast ? "CAST(" : ""}${
      nested ? "" : "ARRAY"
    }[${commaized_content}]${cast ? ` AS ${type})` : ""}`
  } else if (typeof data === "object") {
    return `${quote}${JSON.stringify(data)}${quote}`
  } else {
    return `${quote}${data}${quote}`
  }
}

async function runQuery(query: any) {
  const client = await getWriteableClient()
  let results = await client.query(query)
  return results.rows
}

//TODO: break out into imported file
async function getStates(
  provider_id: any,
  start_time: any = 0,
  end_time: any = Date.now()
) {
  let query = `SELECT * FROM reports_device_states WHERE utc_epoch BETWEEN ${start_time} AND ${end_time}`
  //let query = `SELECT * FROM reports_device_states WHERE provider_id = ${provider_id} AND utc_epoch BETWEEN ${start_time} AND ${end_time}`
  return runQuery(query)
}

async function getTripCount(
  provider_id: any,
  start_time: any = 0,
  end_time: any = Date.now()
) {
  let query = `SELECT count(DISTINCT trip_id) FROM reports_device_states WHERE type = 'event' AND utc_epoch BETWEEN ${start_time} AND ${end_time}`
  //let query = `SELECT count(DISTINCT trip_id) FROM reports_device_states WHERE provider_id = ${provider_id} AND type = 'event' AND utc_epoch BETWEEN ${start_time} AND ${end_time}`
  return runQuery(query)
}

async function getVehicleTripCount(
  device_id: any,
  start_time: any = 0,
  end_time: any = Date.now()
) {
  let query = `SELECT count(DISTINCT trip_id) FROM reports_device_states WHERE type = 'event' AND device_id = '${device_id}' AND utc_epoch BETWEEN ${start_time} AND ${end_time}`
  return runQuery(query)
}

async function getLateEventCount(
  provider_id: any,
  events: any,
  start_time: any = 0,
  end_time: any = Date.now()
) {
  let query = `SELECT count(*) FROM reports_device_states WHERE event_type IN ${events} AND utc_epoch BETWEEN ${start_time} AND ${end_time}`
  //let query = `SELECT count(*) FROM reports_device_states WHERE provider_id = ${provider_id} AND event_type IN ${events} AND utc_epoch BETWEEN ${start_time} AND ${end_time}`
  return runQuery(query)
}

async function getTrips(
  provider_id: any,
  start_time: any = 0,
  end_time: any = Date.now()
) {
  let query = `SELECT * FROM reports_trips WHERE end_time BETWEEN ${start_time} AND ${end_time}`
  //let query = `SELECT * FROM reports_trips WHERE provider_id = ${provider_id} AND utc_epoch BETWEEN ${start_time} AND ${end_time}`
  return runQuery(query)
}

async function insert(table_name: TABLE_NAME, data: { [x: string]: any }) {
  if (!data) {
    return null
  }
  let fields = schema.TABLE_COLUMNS[table_name]
  let query = `INSERT INTO ${String(table_name)} (${commaize(fields, `"`)}) `
  query += `VALUES (${commaize(
    fields.map(field =>
      field.includes("timezone") ? db_time(data[field]) : data[field]
    )
  )})`
  return runQuery(query)
}

async function resetTable(table_name: TABLE_NAME) {
  await runQuery(`TRUNCATE ${String(table_name)}`)
}

/*
 * Returns an array of currently running queries, ordered going from
 * oldest to youngest, and return some stats on how the db cache is doing
 * Interpreting results:
 * - If a query is old, that's probably bad.
 * - 'heap_blks_hit' = the number of blocks that were satisfied from the page cache
 * - 'heap_blks_read' = the number of blocks that had to hit disk/IO layer for reads
 * - When 'heap_blks_hit' is significantly greater than 'heap_blks_read',
 * it means we have a well-cached DB and most of the queries can be satisfied from the cache
 * - A good cache hit ratio is above 99%
 */
async function health(): Promise<{
  using: string
  stats: {
    current_running_queries: number
    cache_hit_result: { heap_read: string; heap_hit: string; ratio: string }
  }
}> {
  log.info("postgres health check")
  const currentQueriesSQL = `SELECT query
    FROM pg_stat_activity
    WHERE query <> '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%' AND query <> ''
    ORDER BY query_start desc`
  const currentQueriesResult = await makeReadOnlyQuery(currentQueriesSQL)
  // Add 1 to the denominator so as to avoid divide by zero errors,
  // especially when testing locally since the db has basically
  // no traffic then
  const cacheHitQuery = `SELECT sum(heap_blks_read) as heap_read, sum(heap_blks_hit)
      as heap_hit, (sum(heap_blks_hit) - sum(heap_blks_read)) / sum(heap_blks_hit + 1)
      as ratio
      FROM pg_statio_user_tables;`
  const [cacheHitResult] = await makeReadOnlyQuery(cacheHitQuery)
  return {
    using: "postgres",
    stats: {
      current_running_queries: currentQueriesResult.length,
      cache_hit_result: cacheHitResult
    }
  }
}

async function startup() {
  await Promise.all([getWriteableClient(), getReadOnlyClient()])
}

async function shutdown(): Promise<void> {
  try {
    const writeableClient = await getWriteableClient()
    await writeableClient.end()
    const readOnlyClient = await getReadOnlyClient()
    await readOnlyClient.end()
  } catch (err) {
    await log.error("error during disconnection", err.stack)
  }
}

async function seed(data: {
  devices?: Device[]
  events?: VehicleEvent[]
  // Making this parameter optional is necessary because if you map over an array of events to get an array of
  // telemetry objects, not every event has a corresponding telemetry object.
  // And sometimes it is necessary to seed some telemetry objects without corresponding events.
  telemetry?: Telemetry[]
}) {
  if (data) {
    log.info("postgres seed start")
    if (data.devices) {
      await Promise.all(
        data.devices.map(async (device: Device) => writeDevice(device))
      )
    }
    log.info("postgres devices seeded")
    if (data.events)
      await Promise.all(
        data.events.map(async (event: VehicleEvent) => writeEvent(event))
      )
    log.info("postgres events seeded")
    if (data.telemetry) {
      await writeTelemetry(data.telemetry)
    }
    log.info("postgres seed done")
    return Promise.resolve()
  }
  return Promise.resolve("no data")
}

export = {
  initialize,
  health,
  getStates,
  getTripCount,
  getVehicleTripCount,
  getLateEventCount,
  getTrips,
  insert,
  resetTable,
  seed,
  startup,
  shutdown,
  readDeviceByVehicleId,
  readDeviceIds,
  readDevice,
  readDeviceList,
  writeDevice,
  updateDevice,
  readEvent,
  readEvents,
  readHistoricalEvents,
  writeEvent,
  readTelemetry,
  writeTelemetry,
  wipeDevice,
  readAudit,
  readAudits,
  writeAudit,
  deleteAudit,
  readAuditEvents,
  writeAuditEvent,
  readGeographies,
  readGeographySummaries,
  writeGeography,
  publishGeography,
  deleteGeography,
  isGeographyPublished,
  editGeography,
  readPolicies,
  writePolicy,
  readPolicy,
  editPolicy,
  deletePolicy,
  writeGeographyMetadata,
  updateGeographyMetadata,
  readSingleGeographyMetadata,
  readSingleGeography,
  readBulkGeographyMetadata,
  writePolicyMetadata,
  updatePolicyMetadata,
  readBulkPolicyMetadata,
  readSinglePolicyMetadata,
  publishPolicy,
  isPolicyPublished,
  readRule,
  getEventCountsPerProviderSince,
  getTelemetryCountsPerProviderSince,
  getTripCountsPerProviderSince,
  getNumVehiclesRegisteredLast24HoursByProvider,
  getMostRecentEventByProvider,
  getVehicleCountsPerProvider,
  getNumEventsLast24HoursByProvider,
  getMostRecentTelemetryByProvider,
  getTripEventsLast24HoursByProvider,
  getEventsLast24HoursPerProvider,
  readEventsWithTelemetry,
  readTripIds,
  readEventsForStatusChanges
}
