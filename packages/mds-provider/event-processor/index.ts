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
import stream, { ReadStreamOptions, StreamItem } from 'mds-stream'
import uuid from 'uuid'
import { isUUID } from 'mds-utils'
import { VehicleEvent, VehicleEventPrimaryKey } from 'mds'
import { StatusChange } from 'mds-db/dist/types'
import { DeviceLabeler } from './labelers/device-labeler'
import { ProviderLabeler } from './labelers/provider-labeler'
import { StreamEntry } from './types'
import { StatusChangesProcessor } from './processors/status-changes-processor'
import { TripLabeler } from './labelers/trip-labeler'
import { TripsProcessor, TripEvent } from './processors/trips-processor'

const isStatusChangesProcessorStreamEntry = (entry: StreamEntry): entry is StreamEntry<VehicleEvent> =>
  entry && typeof entry === 'object' && entry.type === 'event' && typeof entry.data === 'object'

const isTripsProcessorStreamEntry = (entry: StreamEntry): entry is StreamEntry<TripEvent> =>
  isStatusChangesProcessorStreamEntry(entry) &&
  isUUID((entry.data as TripEvent).trip_id) &&
  ['trip_start', 'trip_enter', 'trip_leave', 'trip_end'].includes(entry.data.event_type)

const asStreamEntry = <T>([id, [type, data]]: StreamItem): StreamEntry<T> => {
  return { id, type, data: JSON.parse(data) }
}

const readStreamEntries = async (options: ReadStreamOptions) => {
  const [name, entries] = await stream.readStreamGroup('provider:event', 'event-processor', uuid(), '>', options)
  return {
    name,
    entries: entries.map(asStreamEntry)
  }
}

const streamItemPrimaryKey = (item: StreamItem | null): VehicleEventPrimaryKey => {
  if (item) {
    const {
      data: { timestamp, device_id }
    } = asStreamEntry<VehicleEvent>(item)
    return { timestamp, device_id }
  }
  return null
}

const statusChangePrimaryKey = (item: StatusChange | null): VehicleEventPrimaryKey => {
  if (item) {
    const { event_time: timestamp, device_id } = item
    return { timestamp, device_id }
  }
  return null
}

async function process(options: ReadStreamOptions): Promise<number> {
  logger.info('Processing Event Stream', options)

  const info = await stream.getStreamInfo('provider:event')

  if (info) {
    const events = await db.readEventsRangeExclusive(
      statusChangePrimaryKey(await db.getMostRecentStatusChange()),
      streamItemPrimaryKey(info.firstEntry),
      options.count || 1000
    )

    const { name, entries }: { name: string; entries: StreamEntry[] } =
      events.length > 0
        ? {
            name: 'db:events',
            entries: events.map(event => {
              return {
                id: uuid(),
                type: 'event',
                data: event
              }
            })
          }
        : await readStreamEntries(options)

    if (entries.length > 0) {
      logger.info(`Processing ${entries.length} entries from ${name}`)

      // Run stream labelers
      const [providers, devices, trips] = await Promise.all([
        ProviderLabeler(entries),
        DeviceLabeler(entries),
        TripLabeler(entries)
      ])

      // Run stream processors
      await Promise.all([
        StatusChangesProcessor(
          entries.filter(isStatusChangesProcessorStreamEntry).map(entry => ({
            ...entry,
            labels: { ...providers[entry.id], ...devices[entry.id] }
          }))
        ),
        TripsProcessor(
          entries.filter(isTripsProcessorStreamEntry).map(entry => ({
            ...entry,
            labels: { ...providers[entry.id], ...devices[entry.id], ...trips[entry.id] }
          }))
        )
      ])
      return entries.length
    }
    logger.info('No entries to process.')
  } else {
    logger.info('Stream Unavailable')
  }
  return 0
}

async function start(): Promise<void> {
  logger.info('Starting Event Processor')
  await Promise.all([db.startup(), stream.startup()])
  const info = await stream.getStreamInfo('provider:event')
  // Create the stream and consumer group if they don't exist
  if (!info || info.groups === 0) {
    await stream.createStreamGroup('provider:event', 'event-processor')
    logger.info('Created Consumer Group')
  }
}

async function stop(): Promise<void> {
  logger.info('Stopping Event Processor')
  await Promise.all([stream.shutdown(), db.shutdown()])
}

export type ProviderEventProcessorOptions = ReadStreamOptions

export async function ProviderEventProcessor(options: ReadStreamOptions = {}): Promise<number> {
  await start()
  const processed = await process({ noack: true, ...options })
  await stop()
  return processed
}
