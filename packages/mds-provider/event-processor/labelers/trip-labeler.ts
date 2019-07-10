/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import db from 'mds-db'
import logger from 'mds-logger'
import { UUID } from 'mds'
import { isUUID } from 'mds-utils'
import { Trip } from 'mds-db/types'
import { StreamEntry, StreamEntryLabels } from '../types'

export interface TripLabel {
  trip: Trip
}

type TripStreamEntry = StreamEntry<{ trip_id: UUID }>

export const isTripEntry = (entry: StreamEntry): entry is TripStreamEntry =>
  entry &&
  typeof entry === 'object' &&
  typeof entry.data === 'object' &&
  isUUID((entry as TripStreamEntry).data.trip_id)

export const TripLabeler = async (entries: StreamEntry[]): Promise<StreamEntryLabels<TripLabel>> => {
  const trip_entries = entries.filter(isTripEntry)

  if (trip_entries.length > 0) {
    // Get unique trip ids from all entries
    const trip_ids = [...new Set(trip_entries.map(entry => entry.data.trip_id))]

    // Load the trips
    const trips: Trip[] = await db.readTripList(trip_ids)

    // Create a trip map
    const trip_map = trips.reduce<{ [trip_id: string]: Trip }>(
      (map, trip) => ({ ...map, [trip.provider_trip_id]: trip }),
      {}
    )

    // Create the device labels
    const { labels, labeled } = trip_entries.reduce(
      (result, entry) => {
        const trip = trip_map[entry.data.trip_id]
        return {
          labels: { ...result.labels, [entry.id]: { trip } },
          labeled: trip ? result.labeled + 1 : result.labeled
        }
      },
      { labels: {}, labeled: 0 }
    )

    logger.info(`|- Trip Labeler: Labeled ${labeled} ${labeled === 1 ? 'entry' : 'entries'}`)

    return labels
  }

  return {}
}
