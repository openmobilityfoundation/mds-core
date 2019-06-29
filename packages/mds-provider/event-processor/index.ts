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
import stream, { ReadStreamResult, ReadStreamOptions, StreamItem } from 'mds-stream'
import uuid from 'uuid'
import { DeviceLabeler } from './labelers/device-labeler'
import { ProviderLabeler } from './labelers/provider-labeler'
import { StreamEntry } from './types'
import { StatusChangesProcessor } from './processors/status-changes-processor'
import { TripLabeler } from './labelers/trip-labeler'
import { TripsProcessor } from './processors/trips-processor'

const asStreamEntry = ([id, [type, data]]: StreamItem): StreamEntry => {
  const [recorded, sequence] = id.split('-').map(Number)
  return { id, type, data: JSON.parse(data), recorded, sequence }
}

const asStreamEntries = ([name, entries]: ReadStreamResult): { name: string; entries: StreamEntry[] } => ({
  name,
  entries: entries.map(asStreamEntry)
})

async function process(options: ReadStreamOptions): Promise<void> {
  logger.info('Processing Event Stream', options)
  const results: ReadStreamResult[] | null = await stream.readStreamGroup(
    'provider:event',
    'event-processor',
    uuid(),
    '>',
    options
  )
  if (results) {
    const [{ name, entries }] = results.map(asStreamEntries)
    const totals = entries.reduce<{ [t: string]: number }>((grouped, { type }) => {
      return {
        ...grouped,
        [type]: (grouped[type] || 0) + 1
      }
    }, {})
    logger.info(`Processing ${entries.length} entries from ${name}`, totals)

    // Run stream labelers
    const [providers, devices, trips] = await Promise.all([
      ProviderLabeler(entries),
      DeviceLabeler(entries),
      TripLabeler(entries)
    ])

    const labeled = entries.map(entry => ({
      ...entry,
      labels: { ...providers[entry.id], ...devices[entry.id], ...trips[entry.id] }
    }))

    // Run stream processors
    await Promise.all([StatusChangesProcessor(labeled), TripsProcessor(labeled)])
  } else {
    logger.info('No entries to process.')
  }
}

async function start(): Promise<void> {
  logger.info('Starting Event Processor')
  await Promise.all([db.startup(), stream.startup()])
}

async function stop(): Promise<void> {
  logger.info('Stopping Event Processor')
  await Promise.all([stream.shutdown(), db.shutdown()])
}

export type ProviderEventProcessorOptions = ReadStreamOptions

export async function ProviderEventProcessor(options: ReadStreamOptions = {}): Promise<void> {
  await start()
  await process({ noack: true, ...options })
  await stop()
}
