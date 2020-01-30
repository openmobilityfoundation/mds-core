import log from '@mds-core/mds-logger'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import { VehicleEvent } from '@mds-core/mds-types'
import { now, isStateTransitionValid } from '@mds-core/mds-utils'
import { DbHelperArgs } from './types'

/* eslint-disable no-param-reassign */
// TODO ideally refactor these to return computed values, rather than writing to argument

export const getTripCountsSince = async ({ start_time, end_time, provider_info, fail }: DbHelperArgs) => {
  try {
    const start = now()
    const rows = await db.getTripCountsPerProviderSince(start_time, end_time)
    const finish = now()
    const timeElapsed = finish - start
    await log.info(`MDS-DAILY db.getTripCountsPerProviderSince() time elapsed: ${timeElapsed}`)
    await log.info('trips last 24h', rows)
    rows.map(row => {
      const pid = row.provider_id
      provider_info[pid] = provider_info[pid] || {}
      provider_info[pid].trips_last_24h = Number(row.count)
    })
  } catch (err) {
    await fail(err)
  }
}

export const getTimeSinceLastEvent = async ({ provider_info, fail }: DbHelperArgs) => {
  try {
    const start = now()
    const rows = await cache.getMostRecentEventByProvider()
    /* FIXME fall back to DB if we're missing providers
       await db.getMostRecentEventByProvider() */
    const finish = now()
    const timeElapsed = finish - start
    await log.info(`MDS-DAILY cache.getMostRecentEventByProvider() time elapsed: ${timeElapsed}`)
    await log.info('time since last event', rows)
    rows.map(row => {
      const pid = row.provider_id
      provider_info[pid] = provider_info[pid] || {}
      provider_info[pid].ms_since_last_event = now() - row.max
    })
  } catch (err) {
    await fail(err)
  }
}

export const getEventCountsPerProviderSince = async ({ start_time, end_time, provider_info, fail }: DbHelperArgs) => {
  try {
    const start = now()
    const rows = await db.getEventCountsPerProviderSince(start_time, end_time)
    const finish = now()
    const timeElapsed = finish - start
    await log.info(`MDS-DAILY db.getEventCountsPerProviderSince() time elapsed: ${timeElapsed}`)
    await log.info('time since last event', rows)
    rows.map(row => {
      const pid = row.provider_id
      provider_info[pid] = provider_info[pid] || {}
      provider_info[pid].event_counts_last_24h = provider_info[pid].event_counts_last_24h || {}
      provider_info[pid].late_event_counts_last_24h = provider_info[pid].late_event_counts_last_24h || {}
      provider_info[pid].event_counts_last_24h[row.event_type] = row.count
      provider_info[pid].late_event_counts_last_24h[row.event_type] = row.slacount
    })
  } catch (err) {
    await fail(err)
  }
}

export const getTelemetryCountsPerProviderSince = async ({
  start_time,
  end_time,
  provider_info,
  fail
}: DbHelperArgs) => {
  try {
    const start = now()
    const rows = await db.getTelemetryCountsPerProviderSince(start_time, end_time)
    const finish = now()
    const timeElapsed = finish - start
    await log.info(`MDS-DAILY db.getTelemetryCountsPerProviderSince() time elapsed: ${timeElapsed}`)
    await log.info('time since last event', rows)
    rows.map(row => {
      const pid = row.provider_id
      provider_info[pid] = provider_info[pid] || {}
      provider_info[pid].telemetry_counts_last_24h = row.count
      provider_info[pid].late_telemetry_counts_last_24h = row.slacount
    })
  } catch (err) {
    await fail(err)
  }
}

export const getNumVehiclesRegisteredLast24Hours = async ({
  start_time,
  end_time,
  provider_info,
  fail
}: DbHelperArgs) => {
  try {
    const start = now()
    const rows = await db.getNumVehiclesRegisteredLast24HoursByProvider(start_time, end_time)
    const finish = now()
    const timeElapsed = finish - start
    await log.info(`MDS-DAILY db.getNumVehiclesRegisteredLast24HoursByProvider() time elapsed: ${timeElapsed}`)
    await log.info('num vehicles since last 24', rows)
    rows.map(row => {
      const pid = row.provider_id
      provider_info[pid] = provider_info[pid] || {}
      provider_info[pid].registered_last_24h = row.count
    })
  } catch (err) {
    await fail(err)
  }
}

export const getNumEventsLast24Hours = async ({ start_time, end_time, provider_info, fail }: DbHelperArgs) => {
  try {
    const start = now()
    const rows = await db.getNumEventsLast24HoursByProvider(start_time, end_time)
    const finish = now()
    const timeElapsed = finish - start
    await log.info(`MDS-DAILY db.getNumEventsLast24HoursByProvider() time elapsed: ${timeElapsed}`)
    rows.map(row => {
      const pid = row.provider_id
      provider_info[pid] = provider_info[pid] || {}
      provider_info[pid].events_last_24h = row.count
    })
  } catch (err) {
    await fail(err)
  }
}

export const getConformanceLast24Hours = async ({ start_time, end_time, provider_info, fail }: DbHelperArgs) => {
  try {
    const start = now()
    const rows = await db.getEventsLast24HoursPerProvider(start_time, end_time)
    const finish = now()
    const timeElapsed = finish - start
    await log.info(`MDS-DAILY db.getEventsLast24HoursPerProvider() time elapsed: ${timeElapsed}`)
    const prev_event: { [key: string]: VehicleEvent } = {}
    await log.info('event', rows)
    rows.map(event => {
      const pid = event.provider_id
      provider_info[pid] = provider_info[pid] || {}
      provider_info[pid].events_not_in_conformance = provider_info[pid].events_not_in_conformance || 0
      if (prev_event[event.device_id]) {
        provider_info[pid].events_not_in_conformance += isStateTransitionValid(prev_event[event.device_id], event)
          ? 0
          : 1
      }
      prev_event[event.device_id] = event
    })
  } catch (err) {
    await fail(err)
  }
}

/* eslint-enable no-param-reassign */
