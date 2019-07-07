import {
  Audit,
  AuditEvent,
  VehicleEvent,
  Geography,
  UUID,
  Policy,
  Timestamp,
  Device,
  Telemetry,
  Recorded,
  DeviceID,
  VehicleEventPrimaryKey
} from 'mds'
import {
  convertTelemetryToTelemetryRecord,
  convertTelemetryRecordToTelemetry,
  now,
  isUUID,
  rangeRandomInt,
  isTimestamp,
  seconds,
  days,
  yesterday,
  csv
} from 'mds-utils'
import log from 'mds-logger'

import { QueryResult } from 'pg'
import { dropTables, updateSchema } from './migration'
import {
  ReadEventsResult,
  ReadTripIdsResult,
  ReadTripsResult,
  ReadStatusChangesResult,
  StatusChange,
  Trip,
  TelemetryRecord,
  ReadEventsQueryParams,
  ReadHistoricalEventsQueryParams,
  ReadAuditsQueryParams
} from './types'

import schema from './schema'

import {
  vals_sql,
  cols_sql,
  vals_list,
  to_sql,
  logSql,
  SqlVals,
  SqlExecuter,
  configureClient,
  MDSPostgresClient
} from './sql-utils'

const { env } = process

type DBVal = UUID | string | number | undefined
type ClientType = 'writeable' | 'readonly'

let writeableCachedClient: MDSPostgresClient | null = null
let readOnlyCachedClient: MDSPostgresClient | null = null

async function setupClient(useWriteable: boolean): Promise<MDSPostgresClient> {
  return new Promise((resolve, reject) => {
    const { PG_NAME, PG_USER, PG_PASS, PG_PORT } = env
    let PG_HOST: string | undefined
    if (useWriteable) {
      // eslint-disable-next-line prefer-destructuring
      PG_HOST = env.PG_HOST
    } else {
      PG_HOST = env.PG_HOST_READER || env.PG_HOST
    }

    const client_type: ClientType = useWriteable ? 'writeable' : 'readonly'

    const client = configureClient({
      user: PG_USER,
      database: PG_NAME,
      host: PG_HOST || 'localhost',
      password: PG_PASS,
      port: Number(PG_PORT) || 5432,
      client_type
    })

    client
      .connect()
      .then(async () => {
        if (useWriteable) {
          await updateSchema(client)
        }
        log.info(
          'connected',
          client_type,
          'client to postgres:',
          PG_NAME,
          PG_USER,
          PG_HOST || 'localhost',
          PG_PORT || '5432'
        )
        client.setConnected(true)
        resolve(client)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch((err: any) => {
        log.error('postgres connection error', err.stack).then(() => {
          reject(err)
          client.setConnected(false)
        })
      })
  })
}

async function getWriteableClient(): Promise<MDSPostgresClient> {
  return new Promise((resolve, reject) => {
    if (writeableCachedClient && writeableCachedClient.connected) {
      return resolve(writeableCachedClient)
    }

    setupClient(true)
      .then(result => {
        writeableCachedClient = result
        resolve(result)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch((err: any) => {
        log.error('postgres connection error')
        reject(err)
        writeableCachedClient = null
      })
  })
}

async function getReadOnlyClient(): Promise<MDSPostgresClient> {
  return new Promise((resolve, reject) => {
    if (readOnlyCachedClient && readOnlyCachedClient.connected) {
      return resolve(readOnlyCachedClient)
    }

    setupClient(false)
      .then(result => {
        readOnlyCachedClient = result
        resolve(result)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch((err: any) => {
        log.error('postgres connection error')
        reject(err)
        readOnlyCachedClient = null
      })
  })
}

async function initialize() {
  const client: MDSPostgresClient = await getWriteableClient()
  await dropTables(client)
  await updateSchema(client)
  await getReadOnlyClient()
  return 'postgres'
}

// This should never be exported, to prevent risk of SQL injection.
// Only functions in this module should ever call it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function makeReadOnlyQuery(sql: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function fail(err: any) {
      log.error(`error with SQL query ${sql}`, err.stack || err).then(() => reject(err))
    }

    getReadOnlyClient().then(client => {
      logSql(sql)
      client
        .query(sql)
        .then(result => {
          resolve(result.rows)
        }, fail)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .catch(fail)
    })
  })
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
  stats: { current_running_queries: object[]; cache_hit_result: { heap_read: string; heap_hit: string; ratio: string } }
}> {
  log.info('postgres health check')
  return new Promise(resolve => {
    const currentQueriesSQL = `SELECT query
    FROM pg_stat_activity
    WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%'
    ORDER BY query_start desc`
    makeReadOnlyQuery(currentQueriesSQL).then(currentQueriesResult => {
      // Add 1 to the denominator so as to avoid divide by zero errors,
      // especially when testing locally since the db has basically
      // no traffic then
      const cacheHitQuery = `SELECT sum(heap_blks_read) as heap_read, sum(heap_blks_hit)
      as heap_hit, (sum(heap_blks_hit) - sum(heap_blks_read)) / sum(heap_blks_hit + 1)
      as ratio
      FROM pg_statio_user_tables;`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeReadOnlyQuery(cacheHitQuery).then((cacheHitResult: any) => {
        resolve({
          using: 'postgres',
          stats: {
            current_running_queries: currentQueriesResult,
            cache_hit_result: cacheHitResult[0]
          }
        })
      })
    })
  })
}

async function readDeviceByVehicleId(
  provider_id: UUID,
  vehicle_id: UUID,
  ...alternate_vehicle_ids: UUID[]
): Promise<Recorded<Device>> {
  const client = await getReadOnlyClient()
  const vehicle_ids = [...new Set([vehicle_id, ...alternate_vehicle_ids])]
  const vals = new SqlVals()
  const sql = `SELECT * FROM ${schema.DEVICES_TABLE} WHERE provider_id=${vals.add(
    provider_id
  )} AND translate(vehicle_id, translate(lower(vehicle_id), 'abcdefghijklmnopqrstuvwxyz1234567890', ''), '') ILIKE ANY(ARRAY[${vehicle_ids
    .map(id => vals.add(id))
    .join(', ')}])`

  const values = vals.values()
  logSql(sql, values)
  const result = await client.query(sql, values)
  if (result.rows.length === 1) {
    return result.rows[0] as Recorded<Device>
  }
  const error = `device associated with vehicle ${
    vehicle_ids.length === 1 ? vehicle_id : `(${csv(vehicle_ids)})`
  } for provider ${provider_id}: rows=${result.rows.length}`
  log.warn(error)
  throw Error(error)
}

async function readDeviceIds(provider_id?: UUID, skip?: number, take?: number): Promise<DeviceID[]> {
  return new Promise((resolve, reject) => {
    // read from pg
    getReadOnlyClient().then(client => {
      // FIXME order
      let sql = `SELECT device_id, provider_id FROM ${schema.DEVICES_TABLE}`
      const vals = new SqlVals()
      if (isUUID(provider_id)) {
        sql += ` WHERE provider_id= ${vals.add(provider_id)}`
      }
      sql += ' ORDER BY recorded'
      if (typeof skip === 'number' && skip >= 0) {
        sql += ` OFFSET ${vals.add(skip)}`
      }
      if (typeof take === 'number' && take >= 0) {
        sql += ` LIMIT ${vals.add(take)}`
      }
      const values = vals.values()
      logSql(sql, values)
      client
        .query(sql, values)
        .then(
          res => {
            resolve(res.rows)
          },
          err => {
            log.error(err).then(() => {
              reject(err)
            })
          }
        )
        .catch(err => {
          log.error(err).then(() => {
            reject(err)
          })
        })
    })
  })
}

// TODO: FIX updateDevice/readDevice circular reference
async function readDevice(device_id: UUID): Promise<Recorded<Device>> {
  const callStacker = new Error()
  return new Promise((resolve, reject) => {
    // read from pg
    getReadOnlyClient().then(client => {
      const sql = `SELECT * FROM ${schema.DEVICES_TABLE} WHERE device_id=$1`
      const values = [device_id]
      logSql(sql, values)
      client
        .query(sql, values)
        .then(
          res => {
            // verify one row
            if (res.rows.length === 1) {
              // FIXME stinky! remove!
              if (!res.rows[0].vehicle_id) {
                const vehicle_id = `test-${rangeRandomInt(10000000, 99999999)}`
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                updateDevice(device_id, {
                  vehicle_id
                }).then(() => {
                  log.warn('updated', device_id, 'bogus blank vehicle_id to', vehicle_id)
                })
              }
              resolve(res.rows[0])
            } else {
              log.warn(`readDevice db failed for ${device_id}: rows=${res.rows.length}`, callStacker.stack)
              reject(new Error(`device_id ${device_id} not found`))
            }
          },
          err => {
            log.error(err).then(() => {
              reject(err)
            })
          }
        )
        .catch(err => {
          log.error(err).then(() => {
            reject(err)
          })
        })
    })
  })
}

async function readDeviceList(device_ids: UUID[]) {
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const sql = `SELECT * FROM ${schema.DEVICES_TABLE} WHERE device_id IN (${device_ids.map(device_id =>
    vals.add(device_id)
  )})`
  const values = vals.values()
  logSql(sql, values)
  const result = await client.query(sql, values)
  return result.rows
}

async function writeDevice(device: Device): Promise<Recorded<Device>> {
  try {
    const client = await getWriteableClient()
    // eslint-disable-next-line no-param-reassign
    device.recorded = now()
    const sql = `INSERT INTO ${cols_sql(schema.DEVICES_TABLE, schema.DEVICES_COLS)} ${vals_sql(schema.DEVICES_COLS)}`
    const values = vals_list(schema.DEVICES_COLS, device)
    logSql(sql, values)
    await client.query(sql, values)
    return device as Recorded<Device>
  } catch (err) {
    log.error(err)
    throw err
  }
}

async function updateDevice(device_id: UUID, changes: Partial<Device>): Promise<Device> {
  return new Promise((resolve, reject) => {
    getWriteableClient().then(client => {
      const sql = `UPDATE ${schema.DEVICES_TABLE} SET vehicle_id = $1 WHERE device_id = $2`
      const values = [changes.vehicle_id, device_id]
      logSql(sql, values)
      client
        .query(sql, values)
        .then(
          res => {
            if (res.rowCount === 0) {
              reject(new Error('not found'))
            } else {
              readDevice(device_id)
                .then(resolve, reject)
                .catch(reject)
            }
          },
          err => {
            log.error('update device db error', device_id, err).then(() => {
              reject(err)
            })
          }
        )
        .catch(err => {
          log.error('update device db exception', device_id, err.stack).then(() => {
            reject(err)
          })
        })
    })
  })
}

async function writeEvent(event: VehicleEvent): Promise<Recorded<VehicleEvent>> {
  const device = await readDevice(event.device_id)
  return new Promise((resolve, reject) => {
    if (!device) {
      reject(new Error('device unregistered'))
    } else {
      // write pg
      getWriteableClient().then(client => {
        /* eslint-disable no-param-reassign */
        event.telemetry_timestamp = event.telemetry ? event.telemetry.timestamp : null
        /* eslint-enable no-param-reassign */
        const sql = `INSERT INTO ${cols_sql(schema.EVENTS_TABLE, schema.EVENTS_COLS)} ${vals_sql(schema.EVENTS_COLS)}`
        const values = vals_list(schema.EVENTS_COLS, event)
        logSql(sql, values)
        client
          .query(sql, values)
          .then(() => {
            resolve(event as Recorded<VehicleEvent>)
          }, reject)
          .catch(reject)
      })
    }
  })
}

async function readEvent(device_id: UUID, timestamp?: Timestamp): Promise<VehicleEvent> {
  return new Promise((resolve, reject) => {
    // read from pg
    getReadOnlyClient().then(client => {
      const vals = new SqlVals()
      let sql = `SELECT * FROM ${schema.EVENTS_TABLE} WHERE device_id=${vals.add(device_id)}`
      if (timestamp) {
        sql += ` AND "timestamp"=${vals.add(timestamp)}`
      } else {
        sql += ' ORDER BY "timestamp" DESC LIMIT 1'
      }
      const values = vals.values()
      logSql(sql, values)
      client
        .query(sql, values)
        .then(
          res => {
            // verify one row
            if (res.rows.length === 1) {
              resolve(res.rows[0])
            } else {
              log.info(`readEvent failed for ${device_id}:${timestamp || 'latest'}`)
              reject(new Error(`event for ${device_id}:${timestamp} not found`))
            }
          },
          err => {
            log.error('read event error', err).then(() => {
              reject(err)
            })
          }
        )
        .catch(err => {
          log.error('write event exception', err.stack).then(() => {
            reject(err)
          })
        })
    })
  })
}

async function readEvents(params: ReadEventsQueryParams): Promise<ReadEventsResult> {
  const { skip, take, start_time, end_time, start_recorded, end_recorded, event_types, device_id, trip_id } = params
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const conditions = []

  if (start_time) {
    conditions.push(`"timestamp" >= ${vals.add(start_time)}`)
  }
  if (end_time) {
    conditions.push(`"timestamp" <= ${vals.add(end_time)}`)
  }
  if (start_recorded) {
    conditions.push(`recorded >= ${vals.add(start_recorded)}`)
  }
  if (end_recorded) {
    conditions.push(`recorded <= ${vals.add(end_recorded)}`)
  }
  if (device_id) {
    conditions.push(`device_id = ${vals.add(device_id)}`)
  }
  if (trip_id) {
    conditions.push(`trip_id = ${vals.add(trip_id)}`)
  }
  if (event_types) {
    conditions.push('event_type in')
  }

  const filter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const countSql = `SELECT COUNT(*) FROM ${schema.EVENTS_TABLE} ${filter}`
  const countVals = vals.values()

  logSql(countSql, countVals)
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function fail(err: any) {
      log.error('readEvents error', err.stack || err).then(() => {
        reject(err)
      })
    }

    client
      .query(countSql, countVals)
      .then(res => {
        // log.warn(JSON.stringify(res))
        const count = parseInt(res.rows[0].count)
        let selectSql = `SELECT * FROM ${schema.EVENTS_TABLE} ${filter} ORDER BY recorded`
        if (typeof skip === 'number' && skip >= 0) {
          selectSql += ` OFFSET ${vals.add(skip)}`
        }
        if (typeof take === 'number' && take >= 0) {
          selectSql += ` LIMIT ${vals.add(take)}`
        }
        const selectVals = vals.values()
        logSql(selectSql, selectVals)

        client
          .query(selectSql, selectVals)
          .then(res2 => {
            const events = res2.rows
            resolve({
              events,
              count
            } as ReadEventsResult)
          }, fail)
          .catch(fail)
      }, fail)
      .catch(fail)
  })
}

async function readHistoricalEvents(params: ReadHistoricalEventsQueryParams) {
  const { provider_id: query_provider_id, end_date } = params
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const values = vals.values()
  let sql = `SELECT      e2.provider_id,
  e2.device_id,
  e2.event_type,
  e2.timestamp,
  lat,
  lng,
  speed,
  heading,
  accuracy,
  altitude,
  recorded
FROM
(
SELECT      provider_id,
      device_id,
      event_type,
      timestamp
FROM
(
SELECT      provider_id,
          device_id,
          event_type,
          timestamp,
          recorded,
          RANK() OVER (PARTITION BY device_id ORDER BY timestamp DESC) AS rownum
FROM        events
WHERE         timestamp < '${end_date}'`
  if (query_provider_id) {
    sql += `\nAND         provider_id = '${query_provider_id}'`
  }
  sql += `) e1
  WHERE       rownum = 1
  AND         event_type IN ('trip_enter',
                       'trip_start',
                       'trip_end',
                       'reserve',
                       'cancel_reservation',
                       'provider_drop_off',
                       'service_end',
                       'service_start')
  ) e2
  INNER JOIN  telemetry
  ON          e2.device_id = telemetry.device_id
  AND         e2.timestamp = telemetry.timestamp
  ORDER BY    provider_id,
    device_id,
    event_type`

  const { rows } = await client.query(sql, values)
  const events = rows.reduce((acc: VehicleEvent[], row) => {
    const {
      provider_id,
      device_id,
      event_type,
      timestamp,
      recorded,
      lat,
      lng,
      speed,
      heading,
      accuracy,
      altitude
    } = row
    return [
      ...acc,
      {
        provider_id,
        device_id,
        event_type,
        timestamp,
        recorded,
        telemetry: {
          provider_id,
          device_id,
          timestamp,
          gps: {
            lat,
            lng,
            speed,
            heading,
            accuracy,
            altitude
          }
        }
      }
    ]
  }, [])
  return events
}

async function readTripIds(params: ReadEventsQueryParams): Promise<ReadTripIdsResult> {
  const { skip, take, device_id, min_end_time, max_end_time } = params

  const client = await getReadOnlyClient()

  if (typeof skip !== 'number' || skip < 0) {
    throw new Error('requires integer skip')
  }
  if (typeof take !== 'number' || skip < 0) {
    throw new Error('requires integer take')
  }

  const vals = new SqlVals()
  const conditions = [`event_type = 'trip_end'`]
  if (max_end_time) {
    conditions.push(`"timestamp" <= ${vals.add(Number(max_end_time))}`)
  }
  if (min_end_time) {
    conditions.push(`"timestamp" >= ${vals.add(Number(min_end_time))}`)
  }
  if (device_id) {
    conditions.push(`device_id = ${vals.add(device_id)}`)
  }

  // FIXME left join to pick up vehicle_id?
  const condSql = conditions.join(' AND ')

  const countSql = `SELECT COUNT(*) FROM ${schema.EVENTS_TABLE} WHERE ${condSql}`
  const countVals = vals.values()
  logSql(countSql, countVals)

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function fail(err: any) {
      log.error('readTripIds error', err.stack || err).then(() => {
        reject(err)
      })
    }

    client
      .query(countSql, countVals)
      .then(res => {
        const count = parseInt(res.rows[0].count)

        const selectSql = `SELECT * FROM ${schema.EVENTS_TABLE} WHERE ${condSql} ORDER BY "timestamp" OFFSET ${vals.add(
          skip
        )} LIMIT ${vals.add(take)}`
        const selectVals = vals.values()
        logSql(selectSql, selectVals)

        client
          .query(selectSql, selectVals)
          .then(res2 => {
            resolve({
              tripIds: res2.rows.map(row => row.trip_id),
              count
            })
          }, fail)
          .catch(fail)
      }, fail)
      .catch(fail)
  })
}

async function readTripList(trip_ids: UUID[]) {
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const sql = `SELECT * FROM ${schema.TRIPS_TABLE} WHERE provider_trip_id IN (${trip_ids.map(trip_id =>
    vals.add(trip_id)
  )})`
  const values = vals.values()
  logSql(sql, values)
  const result = await client.query(sql, values)
  return result.rows
}

async function updateTrip(provider_trip_id: UUID, trip: Partial<Trip>) {
  const client = await getWriteableClient()
  const vals = new SqlVals()
  const sql = `UPDATE ${schema.TRIPS_TABLE} SET ${Object.keys(trip)
    .map(key => `${key} = ${vals.add(trip[key as keyof Trip] as string)}`)
    .join(', ')} WHERE provider_trip_id = ${vals.add(provider_trip_id)}`
  const values = vals.values()
  logSql(sql, values)
  const result = await client.query(sql, values)
  return result.rowCount
}

async function writeTelemetry(data: Telemetry[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (data.length === 0) {
      resolve()
    } else {
      getWriteableClient().then(client => {
        const rows: DBVal[] = []
        data.map((telemetry): void => {
          const telemetryRecord: TelemetryRecord = convertTelemetryToTelemetryRecord(telemetry)
          const row = [
            telemetryRecord.device_id,
            telemetryRecord.provider_id,
            telemetryRecord.timestamp,
            telemetryRecord.lat,
            telemetryRecord.lng,
            telemetryRecord.altitude,
            telemetryRecord.heading,
            telemetryRecord.speed,
            telemetryRecord.accuracy,
            telemetryRecord.charge,
            telemetryRecord.recorded
          ]
          rows.push(`(${csv(row.map(to_sql))})`)
        })

        const sql = `INSERT INTO ${cols_sql(schema.TELEMETRY_TABLE, schema.TELEMETRY_COLS)} VALUES ${csv(
          rows
        )} ON CONFLICT DO NOTHING`
        logSql(sql)
        const start = now()
        client
          .query(sql)
          .then(
            () => {
              const delta = now() - start
              if (delta > 200) {
                log.info('pg db writeTelemetry', data.length, 'rows, success in', delta, 'ms')
              }
              resolve()
            },
            err => {
              log.error('pg write telemetry error', err, sql).then(() => {
                reject(err)
              })
            }
          )
          .catch(err => {
            log.error('pg write telemetry exception', err.stack).then(() => {
              reject(err)
            })
          })
      })
    }
  })
}

async function readTelemetry(
  device_id: UUID,
  start?: Timestamp | undefined,
  stop?: Timestamp | undefined
): Promise<Recorded<Telemetry>[]> {
  return new Promise((resolve, reject) => {
    // read from pg
    getWriteableClient().then(client => {
      const vals = new SqlVals()
      let sql = `SELECT * FROM ${schema.TELEMETRY_TABLE} WHERE device_id=${vals.add(device_id)}`
      if (start === undefined && stop === undefined) {
        sql += ' ORDER BY "timestamp" DESC LIMIT 1'
      } else {
        if (start !== undefined) {
          sql += ` AND "timestamp" >= ${vals.add(start)}`
        }
        if (stop !== undefined) {
          sql += ` AND "timestamp" <= ${vals.add(stop)}`
        }
        sql += ' ORDER BY "timestamp"'
      }
      const values = vals.values()
      logSql(sql, values)
      client
        .query(sql, values)
        .then(
          res => {
            resolve(
              res.rows.map((row: TelemetryRecord) => {
                return convertTelemetryRecordToTelemetry(row) as Recorded<Telemetry>
              })
            )
          },
          err => {
            log.error('read telemetry error', err).then(() => {
              reject(err)
            })
          }
        )
        .catch(err => {
          log.error('read telemetry exception', err.stack).then(() => {
            reject(err)
          })
        })
    })
  })
}

async function wipeDevice(device_id: UUID): Promise<QueryResult> {
  return new Promise((resolve, reject) => {
    // read from pg
    getWriteableClient().then(client => {
      const sql =
        `BEGIN;` +
        ` DELETE FROM ${schema.DEVICES_TABLE} WHERE device_id='${device_id}';` +
        ` DELETE FROM ${schema.TELEMETRY_TABLE} WHERE device_id='${device_id}';` +
        ` DELETE FROM ${schema.EVENTS_TABLE} WHERE device_id='${device_id}';` +
        ` COMMIT;`
      logSql(sql)
      client
        .query(sql)
        .then(
          res => {
            // this returns a list of objects that represent the commands that just ran
            resolve(res)
          },
          err => {
            log.error('read telemetry error', err).then(() => {
              reject(err)
            })
          }
        )
        .catch(err => {
          log.error('read telemetry exception', err.stack).then(() => {
            reject(err)
          })
        })
    })
  })
}

async function getEventCountsPerProviderSince(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: UUID; event_type: string; count: number; slacount: number }[]> {
  const thirty_sec = seconds(30)
  const sql = `select provider_id, event_type, count(*), count(case when (recorded-timestamp) > ${thirty_sec} then 1 else null end) as slacount from events where recorded > ${start} and recorded < ${stop} group by provider_id, event_type`
  return makeReadOnlyQuery(sql)
}

async function getEventsLast24HoursPerProvider(start = yesterday(), stop = now()): Promise<VehicleEvent[]> {
  const sql = `select provider_id, device_id, event_type, recorded, timestamp from ${schema.EVENTS_TABLE} where recorded > ${start} and recorded < ${stop} order by "timestamp" ASC`
  return makeReadOnlyQuery(sql)
}

async function getTelemetryCountsPerProviderSince(start = yesterday(), stop = now()) {
  const one_day = days(1)
  const sql = `select provider_id, count(*), count(case when ((recorded-timestamp) > ${one_day}) then 1 else null end) as slacount from telemetry where recorded > ${start} and recorded < ${stop} group by provider_id`
  return makeReadOnlyQuery(sql)
}

async function getTripCountsPerProviderSince(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: string; count: number }[]> {
  const sql = `select provider_id, count(event_type) from events where event_type='trip_end' and recorded > ${start} and recorded < ${stop} group by provider_id, event_type`
  return makeReadOnlyQuery(sql)
}

async function getVehicleCountsPerProvider() {
  const sql = `select provider_id, count(provider_id) from ${schema.DEVICES_TABLE} group by provider_id`
  return makeReadOnlyQuery(sql)
}

async function getNumVehiclesRegisteredLast24HoursByProvider(start = yesterday(), stop = now()) {
  const sql = `select provider_id, count(device_id) from ${schema.DEVICES_TABLE} where recorded > ${start} and recorded < ${stop} group by provider_id`
  return makeReadOnlyQuery(sql)
}

async function getNumEventsLast24HoursByProvider(start = yesterday(), stop = now()) {
  const sql = `select provider_id, count(*) from ${schema.EVENTS_TABLE} where recorded > ${start} and recorded < ${stop} group by provider_id`
  return makeReadOnlyQuery(sql)
}

async function getTripEventsLast24HoursByProvider(start = yesterday(), stop = now()) {
  const sql = `select provider_id, trip_id, event_type, recorded, timestamp from ${schema.EVENTS_TABLE} where trip_id is not null and recorded > ${start} and recorded < ${stop} order by "timestamp"`
  return makeReadOnlyQuery(sql)
}

// TODO way too slow to be useful -- move into mds-cache
async function getMostRecentTelemetryByProvider() {
  const sql = `select provider_id, max(recorded) from ${schema.TELEMETRY_TABLE} group by provider_id`
  return makeReadOnlyQuery(sql)
}

// TODO way too slow to be useful -- move into mds-cache
async function getMostRecentEventByProvider(): Promise<{ provider_id: UUID; max: number }[]> {
  const sql = `select provider_id, max(recorded) from ${schema.EVENTS_TABLE} group by provider_id`
  return makeReadOnlyQuery(sql)
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
    log.error('error during disconnection', err.stack)
  }
}

async function readAudit(audit_trip_id: UUID) {
  const client = await getReadOnlyClient()
  const sql = `SELECT * FROM ${schema.AUDITS_TABLE} WHERE deleted IS NULL AND audit_trip_id=$1`
  const values = [audit_trip_id]
  logSql(sql, values)
  const result = await client.query(sql, values)
  if (result.rows.length === 1) {
    return result.rows[0]
  }
  const error = `readAudit db failed for ${audit_trip_id}: rows=${result.rows.length}`
  log.warn(error)
  throw Error(error)
}

async function readAudits(query: ReadAuditsQueryParams) {
  const client = await getReadOnlyClient()

  const { skip, take, provider_id, provider_vehicle_id, audit_subject_id, start_time, end_time } = query

  const vals = new SqlVals()

  const conditions = [
    `deleted IS NULL`,
    ...(provider_id ? [`provider_id = ${vals.add(provider_id)}`] : []),
    ...(provider_vehicle_id ? [`provider_vehicle_id ILIKE ${vals.add(`%${provider_vehicle_id}%`)}`] : []),
    ...(audit_subject_id ? [`audit_subject_id ILIKE ${vals.add(`%${audit_subject_id}%`)}`] : []),
    ...(start_time ? [`timestamp >= ${vals.add(start_time)}`] : []),
    ...(end_time ? [`timestamp <= ${vals.add(end_time)}`] : [])
  ]

  try {
    const filter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const countSql = `SELECT COUNT(*) FROM ${schema.AUDITS_TABLE} ${filter}`
    const countVals = vals.values()
    logSql(countSql, countVals)
    const countResult = await client.query(countSql, countVals)
    const count = parseInt(countResult.rows[0].count)
    if (count === 0) {
      return {
        count,
        audits: []
      }
    }
    const selectSql = `SELECT * FROM ${schema.AUDITS_TABLE} ${filter} ORDER BY "timestamp" DESC${
      typeof skip === 'number' && skip >= 0 ? ` OFFSET ${vals.add(skip)}` : ''
    }${typeof take === 'number' && take >= 0 ? ` LIMIT ${vals.add(take)}` : ''}`
    const selectVals = vals.values()
    logSql(selectSql, selectVals)
    const selectResult = await client.query(selectSql, selectVals)
    return {
      count,
      audits: selectResult.rows
    }
  } catch (err) {
    log.error('readAudits error', err.stack || err)
    throw err
  }
}

async function writeAudit(audit: Audit & { audit_vehicle_id: UUID }): Promise<Recorded<Audit>> {
  return new Promise((resolve, reject) => {
    // write pg
    getWriteableClient().then(client => {
      // eslint-disable-next-line no-param-reassign
      audit.recorded = now()
      const sql = `INSERT INTO ${cols_sql(schema.AUDITS_TABLE, schema.AUDITS_COLS)} ${vals_sql(schema.AUDITS_COLS)}`
      const values = vals_list(schema.AUDITS_COLS, audit)
      logSql(sql, values)
      client
        .query(sql, values)
        .then(() => {
          resolve(audit)
        }, reject)
        .catch(reject)
    })
  })
}

async function deleteAudit(audit_trip_id: UUID) {
  const client = await getWriteableClient()
  const sql = `UPDATE ${schema.AUDITS_TABLE} SET deleted=$1 WHERE audit_trip_id=$2 AND deleted IS NULL`
  const values = [now(), audit_trip_id]
  logSql(sql, values)
  const result = await client.query(sql, values)
  return result.rowCount
}

async function readAuditEvents(audit_trip_id: UUID): Promise<Recorded<AuditEvent>[]> {
  try {
    const client = await getReadOnlyClient()
    const vals = new SqlVals()
    const sql = `SELECT * FROM ${schema.AUDIT_EVENTS_TABLE} WHERE audit_trip_id=${vals.add(
      audit_trip_id
    )} ORDER BY "timestamp"`
    const sqlVals = vals.values()
    logSql(sql, sqlVals)
    const result = await client.query(sql, sqlVals)
    return result.rows
  } catch (err) {
    log.error('readAuditEvents error', err.stack || err)
    throw err
  }
}

async function writeAuditEvent(event: AuditEvent): Promise<Recorded<AuditEvent>> {
  return new Promise((resolve, reject) => {
    // write pg
    getWriteableClient().then(client => {
      const sql = `INSERT INTO ${cols_sql(schema.AUDIT_EVENTS_TABLE, schema.AUDIT_EVENTS_COLS)} ${vals_sql(
        schema.AUDIT_EVENTS_COLS
      )}`
      const values = vals_list(schema.AUDIT_EVENTS_COLS, { ...event, recorded: now() })
      logSql(sql, values)
      client
        .query(sql, values)
        .then(() => {
          resolve(event as Recorded<AuditEvent>)
        }, reject)
        .catch(reject)
    })
  })
}

async function writeTrips(trips: Trip[]) {
  if (trips.length === 0) {
    throw new Error('writeTrips: zero trips')
  }
  const client = await getWriteableClient()
  return new Promise((resolve, reject) => {
    const rows: (string | number)[] = []
    const recorded = now()
    trips.map((trip, index) => {
      const row = [
        trip.provider_id,
        trip.provider_name,
        trip.provider_trip_id,
        trip.device_id,
        trip.vehicle_id,
        trip.vehicle_type,
        trip.propulsion_type,
        trip.trip_start,
        trip.first_trip_enter,
        trip.last_trip_leave,
        trip.trip_end,
        trip.trip_duration,
        trip.trip_distance,
        JSON.stringify(trip.route),
        trip.accuracy,
        trip.parking_verification_url,
        trip.standard_cost,
        trip.actual_cost,
        trip.recorded || recorded,
        trip.sequence !== null && trip.sequence !== undefined ? Number(trip.sequence) : index
      ]
      rows.push(`(${csv(row.map(to_sql))})`)
    })
    const sql = `INSERT INTO ${cols_sql(schema.TRIPS_TABLE, schema.TRIPS_COLS)} VALUES ${csv(
      rows
    )} ON CONFLICT DO NOTHING`
    logSql(sql)
    client
      .query(sql)
      .then(
        () => {
          resolve({
            count: trips.length
          })
        },
        err => {
          log.error('pg writeTrips error', err).then(() => {
            reject(err)
          })
        }
      )
      .catch(err => {
        log.error('pg writeTrips exception', err.stack).then(() => {
          reject(err)
        })
      })
  })
}

async function readTrips(
  params: Partial<{
    skip: number
    take: number
    provider_id: UUID
    device_id: UUID
    vehicle_id: string
    min_end_time: Timestamp
    max_end_time: Timestamp
    last_sequence: [Timestamp, number]
  }>
): Promise<ReadTripsResult> {
  const client = await getReadOnlyClient()
  const { device_id, vehicle_id, provider_id, min_end_time, max_end_time, skip, take, last_sequence } = params

  const vals = new SqlVals()
  const conditions: string[] = ['trip_start IS NOT NULL', 'trip_end IS NOT NULL']

  if (device_id) {
    if (!isUUID(device_id)) {
      throw new Error(`invalid device_id ${device_id}`)
    } else {
      conditions.push(`device_id = ${vals.add(device_id)}`)
    }
  }

  if (provider_id) {
    if (!isUUID(provider_id)) {
      throw new Error(`invalid provider_id ${provider_id}`)
    } else {
      conditions.push(`provider_id = ${vals.add(provider_id)}`)
    }
  }

  if (vehicle_id) {
    conditions.push(`vehicle_id = ${vals.add(vehicle_id)}`)
  }

  if (min_end_time !== undefined) {
    if (!isTimestamp(min_end_time)) {
      throw new Error(`invalid min_end_time ${min_end_time}`)
    } else {
      conditions.push(`trip_end >= ${vals.add(min_end_time)}`) // FIXME confirm >=
    }
  }

  if (max_end_time !== undefined) {
    if (!isTimestamp(max_end_time)) {
      throw new Error(`invalid max_end_time ${max_end_time}`)
    } else {
      conditions.push(`trip_end <= ${vals.add(max_end_time)}`) // FIXME confirm <=
    }
  }

  if (last_sequence !== undefined && last_sequence.every(Number.isInteger)) {
    const [recorded, sequence] = last_sequence.map(value => vals.add(value))
    conditions.push(`(recorded > ${recorded} OR (recorded = ${recorded} AND sequence > ${sequence}))`)
  }

  const where = conditions.length === 0 ? '' : ` WHERE ${conditions.join(' AND ')}`

  const exec = SqlExecuter(client)

  const {
    rows: [{ count }]
  } = await exec(`SELECT COUNT(*) FROM ${schema.TRIPS_TABLE} ${where}`, vals.values())

  if (count === 0) {
    return { count, trips: [] }
  }

  const { rows: trips } = await exec(
    `SELECT * FROM ${schema.TRIPS_TABLE} ${where} ORDER BY recorded ASC, sequence ASC${
      skip ? ` OFFSET ${vals.add(skip)}` : ''
    }${take ? ` LIMIT ${vals.add(take)}` : ''}`,
    vals.values()
  )

  return { count, trips }
}

async function writeStatusChanges(status_changes: StatusChange[]) {
  if (status_changes.length === 0) {
    throw new Error('writeStatusChanges: zero status_changes')
  }
  const client = await getWriteableClient()
  return new Promise((resolve, reject) => {
    const rows: (string | number)[] = []
    const recorded = now()
    status_changes.map((sc, index) => {
      const row = [
        sc.provider_id,
        sc.provider_name,
        sc.device_id,
        sc.vehicle_id,
        sc.vehicle_type,
        sc.propulsion_type,
        sc.event_type,
        sc.event_type_reason,
        sc.event_time,
        JSON.stringify(sc.event_location),
        sc.battery_pct,
        sc.associated_trip,
        sc.recorded || recorded,
        sc.sequence !== null && sc.sequence !== undefined ? Number(sc.sequence) : index
      ]
      rows.push(`(${csv(row.map(to_sql))})`)
    })
    const sql = `INSERT INTO ${cols_sql(schema.STATUS_CHANGES_TABLE, schema.STATUS_CHANGES_COLS)} VALUES ${csv(
      rows
    )} ON CONFLICT DO NOTHING`
    logSql(sql)
    client
      .query(sql)
      .then(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        () => {
          log.info('pg db writeStatusChanges', status_changes.length, 'rows, success')
          resolve({
            count: status_changes.length
          })
        },
        err => {
          log.error('pg writeStatusChanges error', err, sql).then(() => {
            reject(err)
          })
        }
      )
      .catch(ex => {
        log.error('pg writeStatusChanges exception', ex.stack, sql).then(() => {
          reject(ex)
        })
      })
  })
}

async function readStatusChanges(
  params: Partial<{
    skip: number
    take: number
    provider_id: UUID
    start_time: Timestamp
    end_time: Timestamp
    last_sequence: [Timestamp, number]
  }>
): Promise<ReadStatusChangesResult> {
  const client = await getReadOnlyClient()

  const { provider_id, start_time, end_time, skip, take, last_sequence } = params

  const vals = new SqlVals()
  const conditions = []

  if (provider_id) {
    if (!isUUID(provider_id)) {
      throw new Error(`invalid provider_id ${provider_id}`)
    } else {
      conditions.push(`provider_id = ${vals.add(provider_id)}`)
    }
  }

  if (start_time !== undefined) {
    if (!isTimestamp(start_time)) {
      throw new Error(`invalid start_time ${start_time}`)
    } else {
      conditions.push(`event_time >= ${vals.add(start_time)}`) // FIXME confirm >=
    }
  }

  if (end_time !== undefined) {
    if (!isTimestamp(end_time)) {
      throw new Error(`invalid end_time ${end_time}`)
    } else {
      conditions.push(`event_time <= ${vals.add(end_time)}`) // FIXME confirm <=
    }
  }

  if (last_sequence !== undefined && last_sequence.every(Number.isInteger)) {
    const [recorded, sequence] = last_sequence.map(value => vals.add(value))
    conditions.push(`(recorded > ${recorded} OR (recorded = ${recorded} AND sequence > ${sequence}))`)
  }

  const where = conditions.length === 0 ? '' : ` WHERE ${conditions.join(' AND ')}`

  const exec = SqlExecuter(client)

  const {
    rows: [{ count }]
  } = await exec(`SELECT COUNT(*) FROM ${schema.STATUS_CHANGES_TABLE} ${where}`, vals.values())

  if (count === 0) {
    return { count, status_changes: [] }
  }

  const { rows: status_changes } = await exec(
    `SELECT * FROM ${schema.STATUS_CHANGES_TABLE} ${where} ORDER BY recorded ASC, sequence ASC${
      skip ? ` OFFSET ${vals.add(skip)}` : ''
    }${take ? ` LIMIT ${vals.add(take)}` : ''}`,
    vals.values()
  )

  return { count, status_changes }
}

async function getLatestTime(table: string, field: string): Promise<number> {
  const client = await getReadOnlyClient()
  return new Promise((resolve, reject) => {
    const sql = `SELECT ${field} FROM ${table} ORDER BY ${field} DESC LIMIT 1`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logSql(sql)
    client
      .query(sql)
      .then(res => {
        if (res.rows.length === 1) {
          resolve(res.rows[0][field] as number)
        } else {
          resolve(0) // no latest trip time, start from Dawn Of Time
        }
      }, reject)
      .catch(reject)
  })
}

async function getLatestStatusChangeTime(): Promise<number> {
  return getLatestTime(schema.STATUS_CHANGES_TABLE, 'event_time')
}

async function getLatestTripTime(): Promise<number> {
  return getLatestTime(schema.TRIPS_TABLE, 'trip_end')
}

async function readGeographies(params?: { geography_id?: UUID }): Promise<Geography[]> {
  // use params to filter
  // query on ids
  // return geographies
  const client = await getReadOnlyClient()
  return new Promise((resolve, reject) => {
    let sql = `select * from ${schema.GEOGRAPHIES_TABLE}`
    const values = []
    if (params && params.geography_id) {
      sql += ` where geography_id = $1`
      values.push(params.geography_id)
    }
    // FIXME insufficiently general
    // FIXME add 'count'
    client
      .query(sql, values)
      .then(
        res => {
          resolve(res.rows.map(row => row.geography_json) as Geography[])
        },
        err => {
          log.error(err)
          reject(err)
        }
      )
      .catch(ex => {
        log.error(ex)
        reject(ex.message)
      })
  })
}

async function writeGeography(geography: Geography) {
  // validate TODO
  // write
  const client = await getWriteableClient()
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO ${cols_sql(schema.GEOGRAPHIES_TABLE, schema.GEOGRAPHIES_COLS)} ${vals_sql(
      schema.POLICIES_COLS
    )}`
    const values = [geography.geography_id, JSON.stringify(geography), false]
    client
      .query(sql, values)
      .then(
        () => {
          resolve(geography)
        },
        err => {
          log.error(err)
          reject(err)
        }
      )
      .catch(ex => {
        log.error(ex)
        reject(ex.message)
      })
  })
}

async function readPolicies(params?: {
  policy_id?: UUID
  name?: string
  description?: string
  start_date?: Timestamp
  end_date?: Timestamp
}): Promise<Policy[]> {
  // use params to filter
  // query
  // return policies
  const client = await getReadOnlyClient()
  return new Promise((resolve, reject) => {
    // TODO more params
    let sql = `select * from ${schema.POLICIES_TABLE}`
    const conditions = []
    const vals = new SqlVals()
    if (params && params.policy_id) {
      conditions.push(`policy_id = ${vals.add(params.policy_id)}`)
    }
    if (conditions.length) {
      sql += ` WHERE ${conditions.join(' AND ')}`
    }
    const values = vals.values()
    client
      .query(sql, values)
      .then(
        res => {
          resolve(res.rows.map(row => row.policy_json))
        },
        err => {
          log.error(err)
          reject(err)
        }
      )
      .catch(ex => {
        log.error(ex)
        reject(ex.message)
      })
  })
}

async function writePolicy(policy: Policy) {
  // validate TODO
  // write
  const client = await getWriteableClient()
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO ${cols_sql(schema.POLICIES_TABLE, schema.POLICIES_COLS)} ${vals_sql(schema.POLICIES_COLS)}`
    const values = [policy.policy_id, policy, false]
    client
      .query(sql, values)
      .then(
        () => {
          resolve(policy)
        },
        err => {
          log.error(err)
          reject(err)
        }
      )
      .catch(ex => {
        log.error(ex)
        reject(ex.message)
      })
  })
}

async function getMostRecentStatusChange(): Promise<Recorded<StatusChange> | null> {
  // SELECT * FROM status_changes ORDER BY event_time DESC, device_id DESC LIMIT 1
  const client = await getReadOnlyClient()
  const exec = SqlExecuter(client)
  const results = await exec(
    `SELECT * FROM ${schema.STATUS_CHANGES_TABLE} ORDER BY event_time DESC, device_id DESC LIMIT 1`
  )
  if (results.rowCount === 1) {
    const {
      rows: [result]
    } = results
    return result
  }
  return null
}

async function readEventsRangeExclusive(
  after: VehicleEventPrimaryKey,
  before: VehicleEventPrimaryKey,
  take: number
): Promise<Recorded<VehicleEvent>[]> {
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const exec = SqlExecuter(client)
  const conditions = []
  if (after) {
    const [timestamp, device_id] = [after.timestamp, after.device_id].map(value => vals.add(value))
    conditions.push(`(E.timestamp > ${timestamp} OR (E.timestamp = ${timestamp} AND E.device_id > ${device_id}))`)
  }
  if (before) {
    const [timestamp, device_id] = [before.timestamp, before.device_id].map(value => vals.add(value))
    conditions.push(`(E.timestamp < ${timestamp} OR (E.timestamp = ${timestamp} AND E.device_id < ${device_id}))`)
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const { rows } = await exec(
    `SELECT E.*, T.lat, T.lng FROM ${schema.EVENTS_TABLE} E JOIN ${schema.TELEMETRY_TABLE} T ON E.device_id = T.device_id AND E.telemetry_timestamp = T.timestamp ${where} ORDER BY E.timestamp, E.device_id LIMIT ${take}`,
    vals.values()
  )
  return rows.map(({ lat, lng, telemetry_timestamp, ...event }) => ({
    ...event,
    telemetry_timestamp,
    telemetry: {
      timestamp: telemetry_timestamp,
      gps: { lat, lng }
    }
  }))
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
    log.info('postgres seed start')
    if (data.devices) {
      await Promise.all(data.devices.map(async (device: Device) => writeDevice(device)))
    }
    log.info('postgres devices seeded')
    if (data.events) await Promise.all(data.events.map(async (event: VehicleEvent) => writeEvent(event)))
    log.info('postgres events seeded')
    if (data.telemetry) {
      await writeTelemetry(data.telemetry)
    }
    log.info('postgres seed done')
    return Promise.resolve()
  }
  return Promise.resolve('no data')
}

export = {
  initialize,
  health,
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
  readTripIds,
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
  writeTrips,
  updateTrip,
  readTrips,
  readTripList,
  readGeographies,
  writeGeography,
  readPolicies,
  writePolicy,
  writeStatusChanges,
  readStatusChanges,
  getEventCountsPerProviderSince,
  getTelemetryCountsPerProviderSince,
  getTripCountsPerProviderSince,
  getLatestTripTime,
  getLatestStatusChangeTime,
  getNumVehiclesRegisteredLast24HoursByProvider,
  getMostRecentEventByProvider,
  getVehicleCountsPerProvider,
  getNumEventsLast24HoursByProvider,
  getMostRecentTelemetryByProvider,
  getTripEventsLast24HoursByProvider,
  getEventsLast24HoursPerProvider,
  getMostRecentStatusChange,
  readEventsRangeExclusive
}
