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

import GoogleSpreadsheet from 'google-spreadsheet'
import { promisify } from 'util'
import logger from '@mds-core/mds-logger'
import {
  JUMP_PROVIDER_ID,
  LIME_PROVIDER_ID,
  BIRD_PROVIDER_ID,
  LYFT_PROVIDER_ID,
  WHEELS_PROVIDER_ID,
  SPIN_PROVIDER_ID,
  SHERPA_LA_PROVIDER_ID,
  BOLT_PROVIDER_ID
} from '@mds-core/mds-providers'
import { VEHICLE_EVENT, EVENT_STATUS_MAP, VEHICLE_STATUS } from '@mds-core/mds-types'
import { requestPromiseExceptionHelper, MAX_TIMEOUT_MS } from './utils'
import { VehicleCountResponse, LastDayStatsResponse, MetricsSheetRow, VehicleCountRow } from './types'

// The list of providers ids on which to report
const reportProviders = [
  JUMP_PROVIDER_ID,
  LIME_PROVIDER_ID,
  BIRD_PROVIDER_ID,
  LYFT_PROVIDER_ID,
  WHEELS_PROVIDER_ID,
  SPIN_PROVIDER_ID,
  SHERPA_LA_PROVIDER_ID,
  BOLT_PROVIDER_ID
]

const creds = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.split('\\n').join('\n') : null
}

export function sum(arr: number[]) {
  return arr.reduce((total, amount) => total + (amount || 0))
}

// Round percent to two decimals
export function percent(a: number, total: number) {
  return Math.round(((total - a) / total) * 10000) / 10000
}

export function eventCountsToStatusCounts(events: { [s in VEHICLE_EVENT]: number }) {
  return (Object.keys(events) as VEHICLE_EVENT[]).reduce(
    (acc: { [s in VEHICLE_STATUS]: number }, event) => {
      const status = EVENT_STATUS_MAP[event]
      return Object.assign(acc, {
        [status]: acc[status] + events[event]
      })
    },
    {
      available: 0,
      unavailable: 0,
      reserved: 0,
      trip: 0,
      removed: 0,
      inactive: 0,
      elsewhere: 0
    }
  )
}

export const mapProviderToPayload = (provider: VehicleCountRow, last: LastDayStatsResponse) => {
  const dateOptions = { timeZone: 'America/Los_Angeles', day: '2-digit', month: '2-digit', year: 'numeric' }
  const timeOptions = { timeZone: 'America/Los_Angeles', hour12: false, hour: '2-digit', minute: '2-digit' }
  const d = new Date()
  let [enters, leaves, starts, ends, start_sla, end_sla, telems, telem_sla] = [0, 0, 0, 0, 0, 0, 0, 0]
  let event_counts = { service_start: 0, provider_drop_off: 0, trip_start: 0, trip_end: 0 }
  let status_counts = {
    available: 0,
    unavailable: 0,
    reserved: 0,
    trip: 0,
    removed: 0,
    inactive: 0,
    elsewhere: 0
  }
  const { event_counts_last_24h, late_event_counts_last_24h, late_telemetry_counts_last_24h } = last[
    provider.provider_id
  ]
  if (event_counts_last_24h) {
    event_counts = event_counts_last_24h
    status_counts = eventCountsToStatusCounts(event_counts_last_24h)
    starts = event_counts_last_24h.trip_start || 0
    ends = event_counts_last_24h.trip_end || 0
    enters = event_counts_last_24h.trip_enter || 0
    leaves = event_counts_last_24h.trip_leave || 0
    telems = last[provider.provider_id].telemetry_counts_last_24h || 0
    if (late_telemetry_counts_last_24h !== undefined && late_telemetry_counts_last_24h !== null) {
      telem_sla = telems ? percent(late_telemetry_counts_last_24h, telems) : 0
    }
    if (late_event_counts_last_24h !== undefined && late_event_counts_last_24h !== null) {
      start_sla = starts ? percent(late_event_counts_last_24h.trip_start, starts) : 0
      end_sla = ends ? percent(late_event_counts_last_24h.trip_end, ends) : 0
    }
  }
  return {
    date: `${d.toLocaleDateString('en-US', dateOptions)} ${d.toLocaleTimeString('en-US', timeOptions)}`,
    name: provider.provider,
    registered: provider.count || 0,
    deployed:
      sum([provider.status.available, provider.status.unavailable, provider.status.trip, provider.status.reserved]) ||
      0,
    validtrips: 'tbd', // Placeholder for next day valid trip analysis
    trips: last[provider.provider_id].trips_last_24h || 0,
    servicestart: event_counts.service_start || 0,
    providerdropoff: event_counts.provider_drop_off || 0,
    tripstart: starts,
    tripend: ends,
    tripenter: enters,
    tripleave: leaves,
    telemetry: telems,
    telemetrysla: telem_sla,
    tripstartsla: start_sla,
    tripendsla: end_sla,
    available: status_counts.available,
    unavailable: status_counts.unavailable,
    reserved: status_counts.reserved,
    trip: status_counts.trip,
    removed: status_counts.removed,
    inactive: status_counts.inactive,
    elsewhere: status_counts.elsewhere
  }
}

async function appendSheet(sheetName: string, rows: MetricsSheetRow[]) {
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID)
  await promisify(doc.useServiceAccountAuth)(creds)
  const info = await promisify(doc.getInfo)()
  logger.info(`Loaded doc: ${info.title} by ${info.author.email}`)
  const sheet = info.worksheets.filter((s: { title: string; rowCount: number } & unknown) => s.title === sheetName)[0]
  logger.info(`${sheetName} sheet: ${sheet.title} ${sheet.rowCount}x${sheet.colCount}`)
  if (sheet.title === sheetName) {
    const inserted = rows.map(insert_row => promisify(sheet.addRow)(insert_row))
    logger.info(`Wrote ${inserted.length} rows.`)
    return Promise.all(inserted)
  }
  logger.info('Wrong sheet!')
}

export async function getProviderMetrics(iter: number): Promise<MetricsSheetRow[]> {
  /* after 10 failed iterations, give up */
  if (iter >= 10) {
    throw new Error(`Failed to write to sheet after 10 tries!`)
  }
  const token_options = {
    method: 'POST',
    url: `${process.env.AUTH0_DOMAIN}/oauth/token`,
    headers: { 'content-type': 'application/json' },
    body: {
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      audience: process.env.AUDIENCE
    },
    json: true,
    timeout: MAX_TIMEOUT_MS
  }
  try {
    const token = await requestPromiseExceptionHelper(token_options)
    const counts_options = {
      url: 'https://api.ladot.io/daily/admin/vehicle_counts',
      headers: { authorization: `Bearer ${token.access_token}` },
      json: true,
      timeout: MAX_TIMEOUT_MS
    }
    const last_options = {
      url: 'https://api.ladot.io/daily/admin/last_day_stats_by_provider',
      headers: { authorization: `Bearer ${token.access_token}` },
      json: true,
      timeout: MAX_TIMEOUT_MS
    }

    const counts: VehicleCountResponse = await requestPromiseExceptionHelper(counts_options)
    const last: LastDayStatsResponse = await requestPromiseExceptionHelper(last_options)

    const rows: MetricsSheetRow[] = counts
      .filter(p => reportProviders.includes(p.provider_id))
      .map(provider => mapProviderToPayload(provider, last))
    return rows
  } catch (err) {
    logger.error(`getProviderMetrics() API call error on ${err.url}`, err)
    return getProviderMetrics(iter + 1)
  }
}

export const MetricsLogHandler = async () => {
  try {
    const rows = await getProviderMetrics(0)
    await appendSheet('Metrics Log', rows)
  } catch (err) {
    logger.error('MetricsLogHandler', err)
  }
}
