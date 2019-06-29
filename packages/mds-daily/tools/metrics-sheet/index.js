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

require('dotenv').config()
const GoogleSpreadsheet = require('google-spreadsheet')
const { promisify } = require('util')
const rp = require('request-promise')

// The list of providers ids on which to report
const reportProviders = [
  'c20e08cf-8488-46a6-a66c-5d8fb827f7e0', // JUMP
  '63f13c48-34ff-49d2-aca7-cf6a5b6171c3', // Lime
  '2411d395-04f2-47c9-ab66-d09e9e3c3251', // Bird
  'e714f168-ce56-4b41-81b7-0b6a4bd26128', // Lyft
  'b79f8687-526d-4ae6-80bf-89b4c44dc071', // Wheels
  '70aa475d-1fcd-4504-b69c-2eeb2107f7be', // Spin
  '3c95765d-4da6-41c6-b61e-1954472ec6c9' // Sherpa
]
const creds = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY.split('\\n').join('\n')
}

function sum(arr) {
  return arr.reduce((total, amount) => total + (amount || 0))
}

// Round percent to two decimals
function percent(a, total) {
  return Math.round(((total - a) / total) * 10000) / 10000
}

async function appendSheet(rows) {
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID)
  try {
    await promisify(doc.useServiceAccountAuth)(creds)
    const info = await promisify(doc.getInfo)()
    console.log(`Loaded doc: ${info.title} by ${info.author.email}`)
    const sheet = info.worksheets.filter(sheet => sheet.title === 'Metrics Log')[0]
    console.log(`Metrics sheet: ${sheet.title} ${sheet.rowCount}x${sheet.colCount}`)
    if (sheet.title === 'Metrics Log') {
      const inserted = rows.map(insert_row => promisify(sheet.addRow)(insert_row))
      console.log(`Wrote ${inserted.length} rows.`)
      return await Promise.all(inserted)
    }
    console.log('Wrong sheet!')
  } catch (error) {
    throw error
  }
}

async function getProviderMetrics() {
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
    json: true
  }
  const token = await rp(token_options)
  const counts_options = {
    uri: 'https://api.ladot.io/agency/admin/vehicle_counts',
    headers: { authorization: `Bearer ${token.access_token}` },
    json: true
  }
  const last_options = {
    uri: 'https://api.ladot.io/agency/admin/last_day_stats_by_provider',
    headers: { authorization: `Bearer ${token.access_token}` },
    json: true
  }

  const counts = await rp(counts_options)
  const last = await rp(last_options)

  const rows = counts
    .filter(p => reportProviders.includes(p.provider_id))
    .map(provider => {
      const dateOptions = { timeZone: 'America/Los_Angeles', day: '2-digit', month: '2-digit', year: 'numeric' }
      const timeOptions = { timeZone: 'America/Los_Angeles', hour12: false, hour: '2-digit', minute: '2-digit' }
      const d = new Date()
      let [starts, ends, start_sla, end_sla] = [0, 0, 0, 0]
      let event_counts = { service_start: 0, provider_drop_off: 0, trip_start: 0, trip_end: 0 }
      if (last[provider.provider_id].event_counts_last_24h) {
        event_counts = last[provider.provider_id].event_counts_last_24h
        starts = last[provider.provider_id].event_counts_last_24h.trip_start || 0
        ends = last[provider.provider_id].event_counts_last_24h.trip_end || 0
        telems = last[provider.provider_id].telemetry_counts_last_24h || 0
        telem_sla = telems ? percent(last[provider.provider_id].late_telemetry_counts_last_24h, telems) : 0
        start_sla = starts ? percent(last[provider.provider_id].late_event_counts_last_24h.trip_start, starts) : 0
        end_sla = ends ? percent(last[provider.provider_id].late_event_counts_last_24h.trip_end, ends) : 0
      }
      return {
        date: `${d.toLocaleDateString('en-US', dateOptions)} ${d.toLocaleTimeString('en-US', timeOptions)}`,
        name: provider.provider,
        registered: provider.count || 0,
        deployed:
          sum([
            provider.status.available,
            provider.status.unavailable,
            provider.status.trip,
            provider.status.reserved
          ]) || 0,
        validtrips: 'tbd', // Placeholder for next day valid trip analysis
        trips: last[provider.provider_id].trips_last_24h || 0,
        servicestart: event_counts.service_start || 0,
        providerdropoff: event_counts.provider_drop_off || 0,
        tripstart: starts,
        tripend: ends,
        tripenter: last[provider.provider_id].event_counts_last_24h.trip_enter || 0,
        tripleave: last[provider.provider_id].event_counts_last_24h.trip_leave || 0,
        telemetry: telems,
        telemetrysla: telem_sla,
        tripstartsla: start_sla,
        tripendsla: end_sla
      }
    })
  return rows
}

exports.handler = (event, context) =>
  getProviderMetrics()
    .then(rows => appendSheet(rows))
    .catch(err => console.error(err))
