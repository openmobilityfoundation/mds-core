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

import requestPromise from 'request-promise'

import log from 'mds-logger'
import {
  JUMP_PROVIDER_ID,
  LIME_PROVIDER_ID,
  BIRD_PROVIDER_ID,
  LYFT_PROVIDER_ID,
  WHEELS_PROVIDER_ID,
  SPIN_PROVIDER_ID,
  SHERPA_PROVIDER_ID,
  BOLT_PROVIDER_ID
} from 'mds-providers'

import { VehicleCountResponse } from './types'

require('dotenv').config()

// The list of providers ids on which to report
const reportProviders = [
  JUMP_PROVIDER_ID,
  LIME_PROVIDER_ID,
  BIRD_PROVIDER_ID,
  LYFT_PROVIDER_ID,
  WHEELS_PROVIDER_ID,
  SPIN_PROVIDER_ID,
  SHERPA_PROVIDER_ID,
  BOLT_PROVIDER_ID
]

const creds = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.split('\\n').join('\n') : null
}

async function appendSheet(sheetName: string, rows: ({ date: string; name: string } & unknown)[]) {
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID)
  try {
    await promisify(doc.useServiceAccountAuth)(creds)
    const info = await promisify(doc.getInfo)()
    log.info(`Loaded doc: ${info.title} by ${info.author.email}`)
    const sheet = info.worksheets.filter((s: { title: string; rowCount: number } & unknown) => s.title === sheetName)[0]
    log.info(`${sheetName} sheet: ${sheet.title} ${sheet.rowCount}x${sheet.colCount}`)
    if (sheet.title === sheetName) {
      const inserted = rows.map(insert_row => promisify(sheet.addRow)(insert_row))
      log.info(`Wrote ${inserted.length} rows.`)
      return await Promise.all(inserted)
    }
    log.info('Wrong sheet!')
  } catch (error) {
    throw error
  }
}

async function getProviderMetrics(iter: number): Promise<({ date: string; name: string } & unknown)[]> {
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
    json: true
  }

  try {
    const token = await requestPromise(token_options)
    const counts_options = {
      uri: 'https://api.ladot.io/daily/admin/vehicle_counts',
      headers: { authorization: `Bearer ${token.access_token}` },
      json: true
    }

    const counts: VehicleCountResponse = await requestPromise(counts_options)
    const rows: ({ date: string; name: string } & unknown)[] = counts
      .filter(p => reportProviders.includes(p.provider_id))
      .map(row => {
        const dateOptions = { timeZone: 'America/Los_Angeles', day: '2-digit', month: '2-digit', year: 'numeric' }
        const timeOptions = { timeZone: 'America/Los_Angeles', hour12: false, hour: '2-digit', minute: '2-digit' }
        const d = new Date()
        return {
          date: `${d.toLocaleDateString('en-US', dateOptions)} ${d.toLocaleTimeString('en-US', timeOptions)}`,
          name: row.provider,
          ...row.areas_48h
        }
      })
    return rows
  } catch (err) {
    await log.error('getProviderMetrics', err)
    return getProviderMetrics(iter + 1)
  }
}

export const VehicleCountsHandler = async () => {
  try {
    const rows = await getProviderMetrics(0)
    await appendSheet('Vehicle Counts', rows)
  } catch (err) {
    await log.error('VehicleCountsHandler', err)
  }
}
