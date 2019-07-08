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
import { PROPULSION_TYPE, VEHICLE_TYPE } from 'mds-enums'
import { VehicleEvent, UUID, Timestamp } from 'mds'
import { Trip } from 'mds-db/types'
import { now } from 'mds-utils'
import { DeviceLabel } from '../labelers/device-labeler'
import { LabeledStreamEntry } from '../types'
import { ProviderLabel } from '../labelers/provider-labeler'
import { TripLabel } from '../labelers/trip-labeler'

export type TripEvent = Omit<VehicleEvent, 'trip_id'> & { trip_id: UUID }
export type TripsProcessorStreamEntry = LabeledStreamEntry<ProviderLabel & DeviceLabel & TripLabel, TripEvent>

const asTrip = (recorded: Timestamp) => (entry: TripsProcessorStreamEntry, sequence: number): Trip => {
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
    recorded,
    sequence
  }
}

const insertTrips = async (entries: TripsProcessorStreamEntry[]): Promise<void> => {
  const recorded = now()
  await db.writeTrips(entries.map(asTrip(recorded)))
}

const updateSequence = (trip: Trip, recorded: number, sequence: number) =>
  recorded > trip.recorded || (recorded === trip.recorded && sequence > (trip.sequence || 0))
    ? { recorded, sequence }
    : {}

const updateTrips = async (entries: TripsProcessorStreamEntry[]): Promise<void> => {
  const recorded = now()
  await Promise.all(
    entries.reduce<Promise<number>[]>((updates, { data: { event_type, timestamp }, labels: { trip } }, sequence) => {
      const fields: { [x: string]: keyof Trip } = {
        trip_start: 'trip_start',
        trip_enter: 'first_trip_enter',
        trip_leave: 'last_trip_leave',
        trip_end: 'trip_end'
      }
      const field = fields[event_type]
      return field && !trip[field]
        ? updates.concat(
            db.updateTrip(trip.provider_trip_id, {
              [field]: timestamp,
              ...updateSequence(trip, recorded, sequence)
            })
          )
        : updates
    }, [])
  )
}

export const TripsProcessor = async (entries: TripsProcessorStreamEntry[]): Promise<void> => {
  const { inserts, updates } = entries.reduce<{
    inserts: TripsProcessorStreamEntry[]
    updates: TripsProcessorStreamEntry[]
  }>(
    (commands, entry) => ({
      inserts: entry.labels.trip ? commands.inserts : commands.inserts.concat(entry),
      updates: entry.labels.trip ? commands.updates.concat(entry) : commands.updates
    }),
    { inserts: [], updates: [] }
  )

  if (inserts.length + updates.length > 0) {
    await Promise.all((inserts.length === 0 ? [] : [insertTrips(inserts)]).concat(updateTrips(updates)))
    logger.info(`Trips Processor: Created ${inserts.length} trips; Updated ${updates.length} trips`)
  }
}
