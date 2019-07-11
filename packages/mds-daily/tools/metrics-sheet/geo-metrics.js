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
const {
  JUMP_PROVIDER_ID,
  LIME_PROVIDER_ID,
  BIRD_PROVIDER_ID,
  LYFT_PROVIDER_ID,
  WHEELS_PROVIDER_ID,
  SPIN_PROVIDER_ID,
  SHERPA_PROVIDER_ID,
  BOLT_PROVIDER_ID
} = require('mds-providers')

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
  private_key: process.env.GOOGLE_PRIVATE_KEY.split('\\n').join('\n')
}

async function appendSheet(sheetName, rows) {
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID)
  try {
    await promisify(doc.useServiceAccountAuth)(creds)
    const info = await promisify(doc.getInfo)()
    console.log(`Loaded doc: ${info.title} by ${info.author.email}`)
    const sheet = info.worksheets.filter(sheet => sheet.title === sheetName)[0]
    console.log(`${sheetName} sheet: ${sheet.title} ${sheet.rowCount}x${sheet.colCount}`)
    if (sheet.title === sheetName) {
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
    uri: 'https://api.ladot.io/daily/admin/vehicle_counts',
    headers: { authorization: `Bearer ${token.access_token}` },
    json: true
  }

  let i = 0
  do {
    try {
      const counts = await rp(counts_options)
      const rows = counts
        .filter(p => reportProviders.includes(p.provider_id))
        .map(provider => {
      const dateOptions = { timeZone: 'America/Los_Angeles', day: '2-digit', month: '2-digit', year: 'numeric' }
      const timeOptions = { timeZone: 'America/Los_Angeles', hour12: false, hour: '2-digit', minute: '2-digit' }
      const d = new Date()
      return {
        date: `${d.toLocaleDateString('en-US', dateOptions)} ${d.toLocaleTimeString('en-US', timeOptions)}`,
        name: provider.provider,
        ...provider.areas_48
      }
    })
      return rows
    } catch (err) {
      console.log(err)
      i += 1
    }
  } while (i < 10)
}

//exports.handler = (event, context) =>
  getProviderMetrics()
    .then(rows => appendSheet('Vehicle Counts', rows))
    .catch(err => console.error(err))