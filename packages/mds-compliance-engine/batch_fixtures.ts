/**
 * Copyright 2021 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cache from '@mds-core/mds-agency-cache'
import db from '@mds-core/mds-db'
import { makeDevices, makeEventsWithTelemetry } from '@mds-core/mds-test-data'
import { LA_CITY_BOUNDARY } from '@mds-core/mds-test-data/test-areas/la-city-boundary'
import { Geography, ModalityPolicy, ModalityPolicyTypeInfo } from '@mds-core/mds-types'
import { FeatureCollection } from 'geojson'
import { readJson } from './tests/engine/helpers'

let policies: ModalityPolicy[] = []

const CITY_OF_LA = '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'

const geographies: Geography[] = [
  { name: 'la', geography_id: CITY_OF_LA, geography_json: LA_CITY_BOUNDARY as FeatureCollection }
]

process.env.TIMEZONE = 'America/Los_Angeles'

function now(): number {
  return Date.now()
}

async function fill() {
  policies = await readJson('./test_data/policies.json')

  await db.reinitialize()
  await db.writeGeography(geographies[0])
  await db.publishGeography(geographies[0])
  await cache.startup()

  const TWO_DAYS_IN_MS = 172800000
  const curTime = now()
  const devices = makeDevices(400, curTime)
  const events = makeEventsWithTelemetry(devices, curTime - TWO_DAYS_IN_MS, CITY_OF_LA, {
    event_types: ['trip_end'],
    vehicle_state: 'available',
    speed: 0
  })
  await cache.seed({ devices, events, telemetry: [] })
  await Promise.all(devices.map(device => db.writeDevice(device)))
  await Promise.all(policies.map(policy => db.writePolicy<ModalityPolicyTypeInfo>(policy)))
  await Promise.all(policies.map(policy => db.publishPolicy(policy.policy_id, policy.start_date)))
}

fill()
  .then(res => console.log('done'))
  .catch(err => console.log('err'))
