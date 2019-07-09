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

// The list of providers ids on which to report. TODO: get from config store at some point
const reportProviders = [
  'c20e08cf-8488-46a6-a66c-5d8fb827f7e0', // JUMP
  '63f13c48-34ff-49d2-aca7-cf6a5b6171c3', // Lime
  '2411d395-04f2-47c9-ab66-d09e9e3c3251', // Bird
  'e714f168-ce56-4b41-81b7-0b6a4bd26128', // Lyft
  'b79f8687-526d-4ae6-80bf-89b4c44dc071', // Wheels
  '70aa475d-1fcd-4504-b69c-2eeb2107f7be', // Spin
  '3c95765d-4da6-41c6-b61e-1954472ec6c9', // Sherpa
  '3291c288-c9c8-42f1-bc3e-8502b077cd7f' // Bolt
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
    uri: 'https://api.ladot.io/agency/admin/vehicle_counts',
    headers: { authorization: `Bearer ${token.access_token}` },
    json: true
  }

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
        ...provider.areas
      }
    })
  return rows
}

exports.handler = (event, context) =>
  getProviderMetrics()
    .then(rows => appendSheet('Vehicle Counts', rows))
    .catch(err => console.error(err))