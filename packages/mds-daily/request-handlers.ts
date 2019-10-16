import db from '@mds-core/mds-db'
import log from '@mds-core/mds-logger'
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
import areas from 'ladot-service-areas'
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
  await log.error(
    'last_day_stats_by_provider err:',
    err instanceof Error ? err.message : err,
    err instanceof Error ? err.stack : ''
  )
}

const SERVER_ERROR = {
  error: 'server_error',
  error_description: 'an internal server error has occurred and been logged'
}

const RIGHT_OF_WAY_STATUSES: string[] = [
  VEHICLE_STATUSES.available,
  VEHICLE_STATUSES.unavailable,
  VEHICLE_STATUSES.reserved,
  VEHICLE_STATUSES.trip
]

type Item = Pick<Device, 'provider_id' | 'device_id'>

export async function getRawTripData(req: DailyApiRequest, res: DailyApiResponse) {
  try {
    const { trip_id } = req.params
    const eventsAndCount: { events: VehicleEvent[]; count: number } = await db.readEvents({ trip_id })
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
    await log.error(`raw_trip_data: ${err}`)
    res.status(500).send(SERVER_ERROR)
  }
}

export async function getVehicleCounts(req: DailyApiRequest, res: DailyApiResponse) {
  async function fail(err: Error | string): Promise<void> {
    await log.error('/admin/vehicle_counts fail', err)
    res.status(500).send({
      error: err
    })
  }

  try {
    const rows = await db.getVehicleCountsPerProvider()
    const stats: {
      provider_id: UUID
      provider: string
      count: number
      status: { [s: string]: number }
      event_type: { [s: string]: number }
      areas: { [s: string]: number }
      areas_12h: { [s: string]: number }
      areas_24h: { [s: string]: number }
      areas_48h: { [s: string]: number }
    }[] = rows.map(row => {
      const { provider_id, count } = row
      return {
        provider_id,
        provider: providerName(provider_id),
        count,
        status: {},
        event_type: {},
        areas: {},
        areas_12h: {},
        areas_24h: {},
        areas_48h: {}
      }
    })
    await log.info('/admin/vehicle_counts', JSON.stringify(stats))
    const HRS_12_AGO = now() - 43200000
    const HRS_24_AGO = now() - 86400000
    const HRS_48_AGO = now() - 172800000

    const maps = await getMaps()
    // TODO reimplement to be more efficient
    const { eventMap } = maps
    await Promise.all(
      stats.map(async stat => {
        const items: (Item | undefined)[] = await db.readDeviceIds(stat.provider_id)
        items.filter(filterEmptyHelper<Item>(true)).map(async item => {
          const event = eventMap[item.device_id]
          inc(stat.event_type, event ? event.event_type : 'default')
          const status = event ? EVENT_STATUS_MAP[event.event_type] : VEHICLE_STATUSES.removed
          inc(stat.status, status)
          // TODO latest-state should remove service_area_id if it's null
          if (event && RIGHT_OF_WAY_STATUSES.includes(status) && event.service_area_id) {
            const serviceArea = areas.serviceAreaMap[event.service_area_id]
            if (serviceArea) {
              inc(stat.areas, serviceArea.description)
              if (event.timestamp >= HRS_12_AGO) {
                inc(stat.areas_12h, serviceArea.description)
              }
              if (event.timestamp >= HRS_24_AGO) {
                inc(stat.areas_24h, serviceArea.description)
              }
              if (event.timestamp >= HRS_48_AGO) {
                inc(stat.areas_48h, serviceArea.description)
              }
            }
          }
        })
      })
    )
    await log.info(JSON.stringify(stats))
    res.status(200).send(stats)
  } catch (err) {
    await fail(err)
  }
}

export async function getLastDayTripsByProvider(req: DailyApiRequest, res: DailyApiResponse) {
  async function fail(err: Error | string): Promise<void> {
    await log.error('last_day_trips_by_provider err:', err)
  }

  const { start_time, end_time } = startAndEnd(req.params)
  try {
    const rows = await db.getTripEventsLast24HoursByProvider(start_time, end_time)
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

    Object.keys(provider_info).map(provider_id => {
      provider_info[provider_id].name = providerName(provider_id)
    })
    res.status(200).send(provider_info)
  } catch (err) {
    await log.error('unable to fetch data from last 24 hours', err)
    res.status(500).send(new ServerError())
  }
}
