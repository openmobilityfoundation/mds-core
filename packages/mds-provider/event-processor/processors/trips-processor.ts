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
import { PROPULSION_TYPE, VEHICLE_TYPE, VehicleEvent, UUID } from 'mds-types'
import { Trip } from 'mds-db/types'
import { now } from 'mds-utils'
import { DeviceLabel } from '../labelers/device-labeler'
import { LabeledStreamEntry } from '../types'
import { ProviderLabel } from '../labelers/provider-labeler'
import { TripLabel } from '../labelers/trip-labeler'

export type TripEvent = Omit<VehicleEvent, 'trip_id'> & { trip_id: UUID }
export type TripsProcessorStreamEntry = LabeledStreamEntry<ProviderLabel & DeviceLabel & TripLabel, TripEvent>

const createTrip = (entry: TripsProcessorStreamEntry): Trip => {
  const {
    data: event,
    labels: { provider, device }
  } = entry
  const { provider_id, device_id, trip_id: provider_trip_id, timestamp, event_type } = event
  const { provider_name } = provider
  const { vehicle_id, type: vehicle_type, propulsion: propulsion_type } = device

  return {
    provider_id,
    provider_name,
    device_id,
    vehicle_id,
    vehicle_type: vehicle_type as VEHICLE_TYPE,
    propulsion_type: propulsion_type as PROPULSION_TYPE[],
    provider_trip_id,
    trip_start: event_type === 'trip_start' ? timestamp : null,
    first_trip_enter: event_type === 'trip_enter' ? timestamp : null,
    last_trip_leave: event_type === 'trip_leave' ? timestamp : null,
    trip_end: event_type === 'trip_end' ? timestamp : null,
    recorded: now()
  }
}

const insertTrips = async (trips: Trip[]): Promise<void> => {
  if (trips.length > 0) {
    await db.writeTrips(trips)
    logger.info(`|- Trips Processor: Created ${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}`)
  }
}

const updateTrips = async (trips: Trip[]): Promise<void> => {
  if (trips.length > 0) {
    await Promise.all(trips.map(trip => db.updateTrip(trip.provider_trip_id, trip)))
    logger.info(`|- Trips Processor: Updated ${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}`)
  }
}

const updateTrip = (trip: Trip, { event_type, timestamp }: TripEvent): Trip => {
  return {
    ...trip,
    trip_start: event_type === 'trip_start' ? Math.min(trip.trip_start || timestamp, timestamp) : trip.trip_start,
    first_trip_enter:
      event_type === 'trip_enter' ? Math.min(trip.first_trip_enter || timestamp, timestamp) : trip.first_trip_enter,
    last_trip_leave:
      event_type === 'trip_leave' ? Math.max(trip.last_trip_leave || timestamp, timestamp) : trip.last_trip_leave,
    trip_end: event_type === 'trip_end' ? Math.max(trip.trip_end || timestamp, timestamp) : trip.trip_end,
    recorded: now()
  }
}

export const TripsProcessor = async (entries: TripsProcessorStreamEntry[]): Promise<void> => {
  const { insert, update } = entries.reduce<{
    insert: { [trip_id: string]: Trip }
    update: { [trip_id: string]: Trip }
  }>(
    (trips, entry) => {
      const {
        data: event,
        labels: { trip }
      } = entry
      const { trip_id } = event
      return trip
        ? {
            // Update existing trip
            ...trips,
            update: {
              ...trips.update,
              [trip_id]: updateTrip(trips.update[trip_id] || trip, event)
            }
          }
        : {
            // Insert new trip
            ...trips,
            insert: {
              ...trips.insert,
              [trip_id]: trips.insert[trip_id] ? updateTrip(trips.insert[trip_id], event) : createTrip(entry)
            }
          }
    },
    { insert: {}, update: {} }
  )

  const [inserts, updates] = [insert, update].map(trips => Object.keys(trips).map(trip_id => trips[trip_id]))

  await Promise.all([insertTrips(inserts), updateTrips(updates)])
}
