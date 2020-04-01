import db from '@mds-core/mds-db'
import logger from '@mds-core/mds-logger'
import { providerName } from '@mds-core/mds-providers'
import { now, inc, ServerError, filterEmptyHelper } from '@mds-core/mds-utils'
import {
  UUID,
  VehicleEvent,
  VEHICLE_STATUSES,
  EVENT_STATUS_MAP,
  VEHICLE_EVENT,
  TripsStats,
  Device
} from '@mds-core/mds-types'
import { DailyApiRequest, DailyApiResponse, ProviderInfo } from './types'
import {
  getTimeSinceLastEvent,
  getNumVehiclesRegisteredLast24Hours,
  getTripCountsSince,
  getEventCountsPerProviderSince,
  getNumEventsLast24Hours,
  getTelemetryCountsPerProviderSince,
  getConformanceLast24Hours
} from './db-helpers'
import { startAndEnd, categorizeTrips, getMaps } from './utils'

export async function dbHelperFail(err: Error | string): Promise<void> {
  logger.error(
    'last_day_stats_by_provider err:',
    err instanceof Error ? err.message : err,
    err instanceof Error ? err.stack : ''
  )
}

const SERVER_ERROR = {
  error: 'server_error',
  error_description: 'an internal server error has occurred and been logged'
}

type Item = Pick<Device, 'provider_id' | 'device_id'>

export async function getRawTripData(req: DailyApiRequest, res: DailyApiResponse) {
  try {
    const start = now()
    const { trip_id } = req.params
    const eventsAndCount: { events: VehicleEvent[]; count: number } = await db.readEvents({ trip_id })
    const finish = now()
    const timeElapsed = finish - start
    logger.info(`MDS-DAILY /admin/raw_trip_data/:trip_id -> db.readEvents({ trip_id }) time elapsed: ${timeElapsed}`)
    if (eventsAndCount.events.length > 0) {
      const { events } = eventsAndCount
      events[0].timestamp_long = new Date(events[0].timestamp).toString()
      for (let i = 1; i < events.length; i += 1) {
        events[i].timestamp_long = new Date(events[i].timestamp).toString()
        events[i].delta = events[i].timestamp - events[i - 1].timestamp
      }
      res.status(200).send({ events })
    } else {
      res.status(404).send({ result: 'not_found' })
    }
  } catch (err) {
    logger.error(`raw_trip_data: ${err}`)
    res.status(500).send(SERVER_ERROR)
  }
}

export async function getVehicleCounts(req: DailyApiRequest, res: DailyApiResponse) {
  async function fail(err: Error | string): Promise<void> {
    logger.error('/admin/vehicle_counts fail', err)
    res.status(500).send({
      error: err
    })
  }

  try {
    const start = now()
    const rows = await db.getVehicleCountsPerProvider()
    const finish = now()
    const timeElapsed = finish - start
    logger.info(`MDS-DAILY /admin/vehicle_counts -> db.getVehicleCountsPerProvider() time elapsed: ${timeElapsed}`)
    const stats: {
      provider_id: UUID
      provider: string
      count: number
      status: { [s: string]: number }
      event_type: { [s: string]: number }
    }[] = rows.map(row => {
      const { provider_id, count } = row
      return {
        provider_id,
        provider: providerName(provider_id),
        count,
        status: {},
        event_type: {}
      }
    })
    logger.info('/admin/vehicle_counts', JSON.stringify(stats))

    const maps = await getMaps()
    // TODO reimplement to be more efficient
    const { eventMap } = maps
    await Promise.all(
      stats.map(async stat => {
        const start2 = now()
        const items: (Item | undefined)[] = await db.readDeviceIds(stat.provider_id)
        const finish2 = now()
        const timeElapsed2 = finish2 - start2
        logger.info(
          `MDS-DAILY /admin/vehicle_counts -> db.readDeviceIds(${stat.provider_id}) time elapsed: ${timeElapsed2}`
        )
        items.filter(filterEmptyHelper<Item>(true)).map(async item => {
          const event = eventMap[item.device_id]
          inc(stat.event_type, event ? event.event_type : 'default')
          const status = event ? EVENT_STATUS_MAP[event.event_type] : VEHICLE_STATUSES.removed
          inc(stat.status, status)
        })
      })
    )
    logger.info(JSON.stringify(stats))
    res.status(200).send(stats)
  } catch (err) {
    await fail(err)
  }
}

export async function getLastDayTripsByProvider(req: DailyApiRequest, res: DailyApiResponse) {
  async function fail(err: Error | string): Promise<void> {
    logger.error('last_day_trips_by_provider err:', err)
  }

  const { start_time, end_time } = startAndEnd(req.params)
  try {
    const start = now()
    const rows = await db.getTripEventsLast24HoursByProvider(start_time, end_time)
    const finish = now()
    const timeElapsed = finish - start
    logger.info(
      `MDS-DAILY /admin/last_day_trips_by_provider -> db.getTripEventsLast24HoursByProvider() time elapsed: ${timeElapsed}`
    )
    const perTripId = categorizeTrips(
      rows.reduce(
        (
          acc: {
            [s: string]: { provider_id: UUID; trip_id: UUID; eventTypes: { [t: number]: VEHICLE_EVENT } }
          },
          row
        ) => {
          const tid = row.trip_id
          acc[tid] = acc[tid] || {
            provider_id: row.provider_id,
            trip_id: tid,
            eventTypes: {}
          }
          acc[tid].eventTypes[row.timestamp] = row.event_type
          return acc
        },
        {}
      )
    )

    const provider_info = Object.keys(perTripId).reduce(
      (map: { [s: string]: TripsStats & { name: string } }, provider_id) => {
        return Object.assign(map, { [provider_id]: { ...perTripId[provider_id], name: providerName(provider_id) } })
      },
      {}
    )
    res.status(200).send(provider_info)
  } catch (err) {
    await fail(err)
  }
}

export async function getLastDayStatsByProvider(req: DailyApiRequest, res: DailyApiResponse) {
  const provider_info: ProviderInfo = {}

  const { start_time, end_time } = startAndEnd(req.params)

  try {
    const start = now()
    const dbHelperArgs = { start_time, end_time, provider_info, fail: dbHelperFail }
    await Promise.all([
      getTimeSinceLastEvent(dbHelperArgs),
      getNumVehiclesRegisteredLast24Hours(dbHelperArgs),
      getNumEventsLast24Hours(dbHelperArgs),
      getTripCountsSince(dbHelperArgs),
      getEventCountsPerProviderSince(dbHelperArgs),
      getTelemetryCountsPerProviderSince(dbHelperArgs),
      getConformanceLast24Hours(dbHelperArgs)
    ])
    const finish = now()
    const timeElapsed = finish - start
    logger.info(`MDS-DAILY /admin/last_day_stats_by_provider -> Promise.all(dbHelpers...) time elapsed: ${timeElapsed}`)

    Object.keys(provider_info).map(provider_id => {
      provider_info[provider_id].name = providerName(provider_id)
    })
    res.status(200).send(provider_info)
  } catch (err) {
    logger.error('unable to fetch data from last 24 hours', err)
    res.status(500).send(new ServerError())
  }
}

export async function getTimeSinceLastEventHandler(req: DailyApiRequest, res: DailyApiResponse) {
  const provider_info: ProviderInfo = {}

  const { start_time, end_time } = startAndEnd(req.params)

  try {
    const start = now()
    const dbHelperArgs = { start_time, end_time, provider_info, fail: dbHelperFail }
    await getTimeSinceLastEvent(dbHelperArgs)
    const finish = now()
    const timeElapsed = finish - start
    logger.info(
      `MDS-DAILY /admin/time_since_last_event -> getTimeSinceLastEvent(dbHelperArgs) time elapsed: ${timeElapsed}`
    )

    Object.keys(provider_info).map(provider_id => {
      provider_info[provider_id].name = providerName(provider_id)
    })
    res.status(200).send(provider_info)
  } catch (err) {
    logger.error('unable to fetch data from last 24 hours', err)
    res.status(500).send(new ServerError())
  }
}

export async function getNumVehiclesRegisteredLast24HoursHandler(req: DailyApiRequest, res: DailyApiResponse) {
  const provider_info: ProviderInfo = {}

  const { start_time, end_time } = startAndEnd(req.params)

  try {
    const start = now()
    const dbHelperArgs = { start_time, end_time, provider_info, fail: dbHelperFail }
    await getNumVehiclesRegisteredLast24Hours(dbHelperArgs)
    const finish = now()
    const timeElapsed = finish - start
    logger.info(
      `MDS-DAILY /admin/num_vehicles_registered_last_24_hours -> db.getNumVehiclesRegisteredLast24Hours() time elapsed: ${timeElapsed}`
    )

    Object.keys(provider_info).map(provider_id => {
      provider_info[provider_id].name = providerName(provider_id)
    })
    res.status(200).send(provider_info)
  } catch (err) {
    logger.error('unable to fetch data from last 24 hours', err)
    res.status(500).send(new ServerError())
  }
}

export async function getNumEventsLast24HoursHandler(req: DailyApiRequest, res: DailyApiResponse) {
  const provider_info: ProviderInfo = {}

  const { start_time, end_time } = startAndEnd(req.params)

  try {
    const start = now()
    const dbHelperArgs = { start_time, end_time, provider_info, fail: dbHelperFail }
    await getNumEventsLast24Hours(dbHelperArgs)
    const finish = now()
    const timeElapsed = finish - start
    logger.info(`MDS-DAILY /admin/num_event_last_24_hours -> db.getNumEventsLast24Hours() time elapsed: ${timeElapsed}`)

    Object.keys(provider_info).map(provider_id => {
      provider_info[provider_id].name = providerName(provider_id)
    })
    res.status(200).send(provider_info)
  } catch (err) {
    logger.error('unable to fetch data from last 24 hours', err)
    res.status(500).send(new ServerError())
  }
}

export async function getTripCountsSinceHandler(req: DailyApiRequest, res: DailyApiResponse) {
  const provider_info: ProviderInfo = {}

  const { start_time, end_time } = startAndEnd(req.params)

  try {
    const start = now()
    const dbHelperArgs = { start_time, end_time, provider_info, fail: dbHelperFail }
    await getTripCountsSince(dbHelperArgs)
    const finish = now()
    const timeElapsed = finish - start
    logger.info(`MDS-DAILY /admin/trip_counts_since -> getTripCountsSince() time elapsed: ${timeElapsed}`)

    Object.keys(provider_info).map(provider_id => {
      provider_info[provider_id].name = providerName(provider_id)
    })
    res.status(200).send(provider_info)
  } catch (err) {
    logger.error('unable to fetch data from last 24 hours', err)
    res.status(500).send(new ServerError())
  }
}

export async function getEventCountsPerProviderSinceHandler(req: DailyApiRequest, res: DailyApiResponse) {
  const provider_info: ProviderInfo = {}

  const { start_time, end_time } = startAndEnd(req.params)

  try {
    const start = now()
    const dbHelperArgs = { start_time, end_time, provider_info, fail: dbHelperFail }
    await getEventCountsPerProviderSince(dbHelperArgs)
    const finish = now()
    const timeElapsed = finish - start
    logger.info(
      `MDS-DAILY /admin/event_counts_per_provider_since -> getEventCountsPerProviderSince() time elapsed: ${timeElapsed}`
    )

    Object.keys(provider_info).map(provider_id => {
      provider_info[provider_id].name = providerName(provider_id)
    })
    res.status(200).send(provider_info)
  } catch (err) {
    logger.error('unable to fetch data from last 24 hours', err)
    res.status(500).send(new ServerError())
  }
}

export async function getTelemetryCountsPerProviderSinceHandler(req: DailyApiRequest, res: DailyApiResponse) {
  const provider_info: ProviderInfo = {}

  const { start_time, end_time } = startAndEnd(req.params)

  try {
    const start = now()
    const dbHelperArgs = { start_time, end_time, provider_info, fail: dbHelperFail }
    await getTelemetryCountsPerProviderSince(dbHelperArgs)
    const finish = now()
    const timeElapsed = finish - start
    logger.info(
      `MDS-DAILY /admin/telemetry_counts_per_provider_since -> getTelemetryCountsPerProviderSince() time elapsed: ${timeElapsed}`
    )

    Object.keys(provider_info).map(provider_id => {
      provider_info[provider_id].name = providerName(provider_id)
    })
    res.status(200).send(provider_info)
  } catch (err) {
    logger.error('unable to fetch data from last 24 hours', err)
    res.status(500).send(new ServerError())
  }
}

export async function getConformanceLast24HoursHandler(req: DailyApiRequest, res: DailyApiResponse) {
  const provider_info: ProviderInfo = {}

  const { start_time, end_time } = startAndEnd(req.params)

  try {
    const start = now()
    const dbHelperArgs = { start_time, end_time, provider_info, fail: dbHelperFail }
    await getConformanceLast24Hours(dbHelperArgs)
    const finish = now()
    const timeElapsed = finish - start
    logger.info(
      `MDS-DAILY /admin/conformance_last_24_hours -> getConformanceLast24Hours() time elapsed: ${timeElapsed}`
    )

    Object.keys(provider_info).map(provider_id => {
      provider_info[provider_id].name = providerName(provider_id)
    })
    res.status(200).send(provider_info)
  } catch (err) {
    logger.error('unable to fetch data from last 24 hours', err)
    res.status(500).send(new ServerError())
  }
}
