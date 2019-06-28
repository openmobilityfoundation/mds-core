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
import { now, isUUID } from 'mds-utils'
import { PROPULSION_TYPE, VEHICLE_TYPE } from 'mds-enums'
import { VehicleEvent, UUID } from 'mds'
import { Trip } from 'mds-db/types'
import { DeviceLabel } from '../labelers/device-labeler'
import { LabeledStreamEntry } from '../types'
import { ProviderLabel } from '../labelers/provider-labeler'
import { TripLabel } from '../labelers/trip-labeler'

type TripsProcessorEntry = LabeledStreamEntry<ProviderLabel & DeviceLabel & TripLabel, TripEvent, 'event'>

function asTrip(entry: TripsProcessorEntry): Trip {
  const {
    data: event,
    labels: { provider, device }
  } = entry
  const { provider_id, device_id, trip_id: provider_trip_id, timestamp, event_type, recorded = now() } = event
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
    recorded
  }
}

const insertTrips = async (entries: TripsProcessorEntry[]): Promise<void> => {
  await db.writeTrips(entries.map(asTrip))
}

const updateTrips = async (entries: TripsProcessorEntry[]): Promise<void> => {
  await Promise.all(
    entries.reduce<Promise<number>[]>((updates, { data: { event_type, timestamp }, labels: { trip } }) => {
      const fields: { [x: string]: keyof Trip } = {
        trip_start: 'trip_start',
        trip_enter: 'first_trip_enter',
        trip_leave: 'last_trip_leave',
        trip_end: 'trip_end'
      }
      const field = fields[event_type]
      return field && !trip[field]
        ? updates.concat(db.updateTrip(trip.provider_trip_id, { [field]: timestamp }))
        : updates
    }, [])
  )
}

type TripEvent = Omit<VehicleEvent, 'trip_id'> & { trip_id: UUID }

const isTripEventEntry = <Label>(
  entry: LabeledStreamEntry<Label>
): entry is LabeledStreamEntry<Label, TripEvent, 'event'> =>
  entry &&
  typeof entry === 'object' &&
  entry.type === 'event' &&
  typeof entry.data === 'object' &&
  isUUID((entry.data as TripEvent).trip_id)

const TripEventProcessor = async (
  entries: LabeledStreamEntry<ProviderLabel & DeviceLabel & TripLabel, TripEvent, 'event'>[]
): Promise<void> => {
  const { inserts, updates } = entries.reduce<{
    inserts: TripsProcessorEntry[]
    updates: TripsProcessorEntry[]
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

export const TripsProcessor = async (
  entries: LabeledStreamEntry<ProviderLabel & DeviceLabel & TripLabel>[]
): Promise<void> => {
  await TripEventProcessor(
    entries
      .filter(isTripEventEntry)
      .filter(entry => ['trip_start', 'trip_enter', 'trip_leave', 'trip_end'].includes(entry.data.event_type))
  )
}
