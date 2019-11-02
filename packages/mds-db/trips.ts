import { UUID, VEHICLE_EVENT } from '@mds-core/mds-types'
import { now, yesterday } from '@mds-core/mds-utils'

import schema from './schema'

import { makeReadOnlyQuery } from './client'

export async function getTripCountsPerProviderSince(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: string; count: number }[]> {
  const sql = `select provider_id, count(event_type) from events where event_type='trip_end' and recorded > ${start} and recorded < ${stop} group by provider_id, event_type`
  return makeReadOnlyQuery(sql)
}

export async function getTripEventsLast24HoursByProvider(
  start = yesterday(),
  stop = now()
): Promise<{ provider_id: UUID; trip_id: UUID; event_type: VEHICLE_EVENT; recorded: number; timestamp: number }[]> {
  const sql = `select provider_id, trip_id, event_type, recorded, timestamp from ${schema.TABLE.events} where trip_id is not null and recorded > ${start} and recorded < ${stop} order by "timestamp"`
  return makeReadOnlyQuery(sql)
}
