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
import { providers } from '@mds-core/mds-providers'
import { makeDevices, makeEventsWithTelemetry } from '@mds-core/mds-test-data'
import { LA_CITY_BOUNDARY } from '@mds-core/mds-test-data/test-areas/la-city-boundary'
import { Device_v1_1_0, Geography, ModalityPolicy, ModalityPolicyTypeInfo } from '@mds-core/mds-types'
import { minutes, now } from '@mds-core/mds-utils'
import { FeatureCollection } from 'geojson'
import { readJson } from '../tests/engine/helpers'

let policies: ModalityPolicy[] = []

const CITY_OF_LA = '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'

const geographies: Geography[] = [
  { name: 'la', geography_id: CITY_OF_LA, geography_json: LA_CITY_BOUNDARY as FeatureCollection }
]

process.env.TIMEZONE = 'America/Los_Angeles'

/**
 * Generate fixtures for the top-level batch_process.ts script to run against
 * and populates the cache and db. It didn't feel worth the effort to make
 * a proper test that mocked out the ComplianceSnapshotService.
 */
async function main() {
  policies = await readJson('./test_data/policies.json')

  await db.reinitialize()
  await db.writeGeography(geographies[0])
  await db.publishGeography(geographies[0])
  await cache.startup()

  const providerIDs = Object.keys(providers).slice(0, 4)
  const devices = providerIDs.reduce((acc: Device_v1_1_0[], providerID) => {
    acc = acc.concat(makeDevices(20000, now(), providerID))
    return acc
  }, [])

  const events = makeEventsWithTelemetry(devices, now() - minutes(30), CITY_OF_LA, {
    event_types: ['trip_end'],
    vehicle_state: 'available',
    speed: 2000
  })

  await cache.seed({ devices, events, telemetry: [] })
  await Promise.all(devices.map(device => db.writeDevice(device)))
  await Promise.all(policies.map(policy => db.writePolicy<ModalityPolicyTypeInfo>(policy)))
  await Promise.all(policies.map(policy => db.publishPolicy(policy.policy_id, policy.start_date)))
}

main()
  .then(res => cache.shutdown())
  .then(res => db.shutdown())
  .catch(err => console.log(err))
