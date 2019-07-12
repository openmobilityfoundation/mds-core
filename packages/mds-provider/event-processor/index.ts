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
import { VehicleEvent, Timestamp, UUID } from 'mds'
import { DeviceLabeler } from './labelers/device-labeler'
import { ProviderLabeler } from './labelers/provider-labeler'
import { StreamEntry } from './types'
import { StatusChangesProcessor } from './processors/status-changes-processor'
import { TripLabeler } from './labelers/trip-labeler'
import { TripsProcessor, TripEvent } from './processors/trips-processor'

export type ProviderEventProcessorOptions = ReadStreamOptions & Partial<{ interval: number }>

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

const streamItemVehicleEventKey = (item: StreamItem | null): { timestamp: Timestamp; device_id: UUID } | null => {
  if (item) {
    const {
      data: { timestamp, device_id }
    } = asStreamEntry<VehicleEvent>(item)
    return { timestamp, device_id }
  }
  return null
}

const processor = async (options: ReadStreamOptions): Promise<number> => {
  const info = await stream.getStreamInfo('provider:event')

  if (info) {
    const { count, events } = await db.readUnprocessedStatusChangeEvents(
      streamItemVehicleEventKey(info.firstEntry),
      options.count
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
      logger.info(
        `Processing ${entries.length} entries from ${name} ${count > 0 ? `backlog (${count} events)` : 'stream'}`
      )

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
  } else {
    logger.info('Stream Unavailable')
  }
  return 0
}

const start = async (): Promise<void> => {
  logger.info('Starting Event Processor')
  await Promise.all([db.startup(), stream.startup()])
  const info = await stream.getStreamInfo('provider:event')
  // Create the stream and consumer group if they don't exist
  if (!info || info.groups === 0) {
    await stream.createStreamGroup('provider:event', 'event-processor')
    logger.info('Created Consumer Group')
  }
}

const stop = async (): Promise<void> => {
  logger.info('Stopping Event Processor')
  await Promise.all([stream.shutdown(), db.shutdown()])
}

const wait = async (interval: number): Promise<number> =>
  interval > 0 ? new Promise(resolve => setTimeout(() => resolve(interval), interval)) : Promise.resolve(interval)

/* eslint-disable no-await-in-loop */
/* eslint-reason this is the event processor's event loop */
const process = async (options: ProviderEventProcessorOptions = {}): Promise<number> => {
  const { interval = 5000, noack = true, count = 1000 } = options
  logger.info('Processing Event Stream', { interval, noack, count })
  let processed = 0
  do {
    processed += await processor({ noack, count })
  } while ((await wait(interval)) > 0)
  return processed
}
/* eslint-enable no-await-in-loop */

export const ProviderEventProcessor = async (options: ProviderEventProcessorOptions = {}): Promise<number> => {
  await start()
  const processed = await process(options)
  await stop()
  return processed
}
