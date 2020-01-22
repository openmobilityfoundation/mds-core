import {
  StateEntry,
  TripEntry,
  MetricsTableRow,
  Recorded,
  UUID,
  Timestamp,
  VEHICLE_TYPE,
  VEHICLE_EVENT
} from '@mds-core/mds-types'
import schema from './schema'
import { vals_sql, cols_sql, vals_list, logSql, SqlVals } from './sql-utils'
import { getWriteableClient, makeReadOnlyQuery } from './client'

export async function getVehicleType(device_id: UUID): Promise<VEHICLE_TYPE | null>{
  const vals = new SqlVals()
  const query = `SELECT type FROM devices WHERE device_id = ${vals.add(device_id)}`
  await logSql(query, vals)
  const [queryResult]  = await makeReadOnlyQuery(query, vals)
  return queryResult?.type ?? null
}

export async function getStates(
  provider_id: UUID,
  vehicleType: VEHICLE_TYPE,
  start_time: Timestamp = 0,
  end_time: Timestamp = Date.now()
): Promise<StateEntry[]> {
  const vals = new SqlVals()
  const query = `SELECT * FROM reports_device_states WHERE provider_id = ${vals.add(
    provider_id
  )} AND vehicle_type = ${vals.add(vehicleType)} AND recorded BETWEEN ${vals.add(start_time)} AND ${vals.add(end_time)}`
  await logSql(query, vals)
  return makeReadOnlyQuery(query, vals)
}

export async function getTripCount(
  provider_id: UUID,
  vehicleType: VEHICLE_TYPE,
  start_time: Timestamp = 0,
  end_time: Timestamp = Date.now()
): Promise<Array<{ count: number }>> {
  const vals = new SqlVals()
  const query = `SELECT count(DISTINCT trip_id) FROM reports_device_states WHERE provider_id = ${vals.add(
    provider_id
  )} AND vehicle_type = ${vals.add(vehicleType)} AND type = 'event' AND recorded BETWEEN ${vals.add(
    start_time
  )} AND ${vals.add(end_time)}`
  await logSql(query, vals)
  return makeReadOnlyQuery(query, vals)
}

export async function getVehicleTripCount(
  device_id: UUID,
  start_time: Timestamp = 0,
  end_time: Timestamp = Date.now()
): Promise<Array<{ [count: string]: number }>> {
  const vals = new SqlVals()
  const query = `SELECT count(DISTINCT trip_id) FROM reports_device_states WHERE device_id = ${vals.add(
    device_id
  )} AND type = 'event' AND recorded BETWEEN ${vals.add(start_time)} AND ${vals.add(end_time)}`
  await logSql(query, vals)
  return makeReadOnlyQuery(query, vals)
}

export async function getLateEventCount(
  provider_id: UUID,
  vehicleType: VEHICLE_TYPE,
  events: VEHICLE_EVENT[],
  SLA: number,
  start_time: Timestamp = 0,
  end_time: Timestamp = Date.now()
): Promise<Array<{ count: number; min: Timestamp; max: Timestamp; average: Timestamp }>> {
  const vals = new SqlVals()
  const query = `SELECT count(*), min(recorded-timestamp), max(recorded-timestamp), avg(recorded-timestamp) FROM reports_device_states WHERE provider_id = ${vals.add(
    provider_id
  )} AND vehicle_type = ${vals.add(vehicleType)} AND type = 'event' AND event_type IN (${events.map(event =>
    vals.add(event)
  )}) AND recorded BETWEEN ${vals.add(start_time)} AND ${vals.add(end_time)} AND recorded-timestamp <= ${vals.add(SLA)}`
  await logSql(query, vals)
  return makeReadOnlyQuery(query, vals)
}

export async function getLateTelemetryCount(
  provider_id: UUID,
  vehicleType: VEHICLE_TYPE,
  SLA: number,
  start_time: Timestamp = 0,
  end_time: Timestamp = Date.now()
): Promise<Array<{ count: number; min: Timestamp; max: Timestamp; average: Timestamp }>> {
  const vals = new SqlVals()
  const query = `SELECT count(*)  FROM reports_device_states WHERE provider_id = ${vals.add(
    provider_id
  )} AND vehicle_type = ${vals.add(vehicleType)} AND type = 'telemetry' AND recorded BETWEEN ${vals.add(
    start_time
  )} AND ${vals.add(end_time)} AND recorded-timestamp <= ${vals.add(SLA)}`
  await logSql(query, vals)
  return makeReadOnlyQuery(query, vals)
}

export async function getTrips(
  provider_id: UUID,
  vehicleType: VEHICLE_TYPE,
  start_time: Timestamp = 0,
  end_time: Timestamp = Date.now()
): Promise<TripEntry[]> {
  const vals = new SqlVals()
  const query = `SELECT * FROM reports_trips WHERE provider_id = ${vals.add(provider_id)} AND vehicle_type = ${vals.add(
    vehicleType
  )} AND end_time BETWEEN ${vals.add(start_time)} AND ${vals.add(end_time)}`
  await logSql(query, vals)
  return makeReadOnlyQuery(query, vals)
}

export async function insertDeviceStates(state: StateEntry) {
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.reports_device_states} (${cols_sql(
    schema.TABLE_COLUMNS.reports_device_states
  )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.reports_device_states)}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.reports_device_states, { ...state })
  await logSql(sql, values)
  const {
    rows: [recorded_state]
  }: { rows: Recorded<StateEntry>[] } = await client.query(sql, values)
  return { ...state, ...recorded_state }
}

export async function insertTrips(trip: TripEntry) {
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.reports_trips} (${cols_sql(
    schema.TABLE_COLUMNS.reports_trips
  )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.reports_trips)}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.reports_trips, { ...trip })
  await logSql(sql, values)
  const {
    rows: [recorded_trip]
  }: { rows: Recorded<StateEntry>[] } = await client.query(sql, values)
  return { ...trip, ...recorded_trip }
}

export async function insertMetrics(metric: MetricsTableRow) {
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.reports_providers} (${cols_sql(
    schema.TABLE_COLUMNS.reports_providers
  )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.reports_providers)}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.reports_providers, { ...metric })
  await logSql(sql, values)
  const {
    rows: [recorded_metric]
  }: { rows: Recorded<StateEntry>[] } = await client.query(sql, values)
  return { ...metric, ...recorded_metric }
}

interface GetAllMetricsArgs {
  start_time: Timestamp
  end_time: Timestamp
  provider_ids: UUID[]
  geography_id: UUID | null
  vehicle_types: VEHICLE_TYPE[]
}

export async function getAllMetrics({
  start_time,
  end_time,
  provider_ids,
  geography_id,
  vehicle_types
}: GetAllMetricsArgs): Promise<Array<MetricsTableRow>> {
  const vals = new SqlVals()
  const providerSegment =
    provider_ids.length !== 0 ? ` AND provider_id IN (${provider_ids.map(provider_id => vals.add(provider_id))}) ` : ''
  const geographySegment = geography_id !== null ? ` AND geography_id = "${geography_id}" ` : ''
  const vehicleTypeSegment =
    vehicle_types.length !== 0
      ? ` AND vehicle_type IN (${vehicle_types.map(vehicle_type => vals.add(vehicle_type))}) `
      : ''
  const query = `SELECT * FROM reports_providers WHERE start_time BETWEEN ${start_time} AND ${end_time}${providerSegment}${geographySegment}${vehicleTypeSegment}`
  await logSql(query, vals)
  return makeReadOnlyQuery(query, vals)
}
