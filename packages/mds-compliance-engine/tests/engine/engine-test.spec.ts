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
import { ComplianceSnapshotDomainModel } from '@mds-core/mds-compliance-service/@types'
import db from '@mds-core/mds-db'
import { PolicyDomainModel } from '@mds-core/mds-policy-service'
import { TEST1_PROVIDER_ID } from '@mds-core/mds-providers'
import { LA_CITY_BOUNDARY, makeDevices, makeEventsWithTelemetry } from '@mds-core/mds-test-data'
import { Device, Geography, VehicleEvent } from '@mds-core/mds-types'
import assert from 'assert'
import { FeatureCollection } from 'geojson'
import test from 'unit.js'
import { VehicleEventWithTelemetry } from '../../@types'
import { filterEvents, getAllInputs, getSupersedingPolicies } from '../../engine/helpers'
import { processPolicy } from '../../engine/mds-compliance-engine'
import {
  ARBITRARY_EVENT_TYPES_POLICY,
  COUNT_POLICY_JSON,
  EXPIRED_POLICY,
  LOW_COUNT_POLICY
} from '../../test_data/fixtures'
import { readJson } from './helpers'

let policies: PolicyDomainModel[] = []

const CITY_OF_LA = '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'

const geographies: Geography[] = [
  { name: 'la', geography_id: CITY_OF_LA, geography_json: LA_CITY_BOUNDARY as FeatureCollection }
]

process.env.TIMEZONE = 'America/Los_Angeles'

function now(): number {
  return Date.now()
}

describe('Tests General Compliance Engine Functionality', () => {
  before(async () => {
    policies = await readJson('test_data/policies.json')
  })

  beforeEach(async () => {
    await db.reinitialize()
    await cache.startup()
  })

  it('Verifies not considering events older than 48 hours', async () => {
    const TWO_DAYS_IN_MS = 172800000
    const curTime = now()
    const devices = makeDevices(400, curTime)
    const events = makeEventsWithTelemetry(devices, curTime - TWO_DAYS_IN_MS, CITY_OF_LA, {
      event_types: ['trip_end'],
      vehicle_state: 'available',
      speed: 0
    })
    await cache.seed({ devices, events, telemetry: [] })
    await Promise.all(devices.map(async device => db.writeDevice(device)))

    // make sure this helper works
    const recentEvents = filterEvents(events) as VehicleEventWithTelemetry[]
    test.assert.deepEqual(recentEvents.length, 0)

    // Mimic what we do in the real world to get inputs to feed into the compliance engine.
    const supersedingPolicies = getSupersedingPolicies(policies)
    const inputs = await getAllInputs()
    const policyResults = await Promise.all(
      supersedingPolicies.map(policy => processPolicy(policy, geographies, inputs))
    )
    policyResults.forEach(complianceSnapshots => {
      complianceSnapshots.forEach(complianceSnapshot => {
        test.assert.deepEqual(complianceSnapshot?.vehicles_found.length, 0)
      })
    })
  })

  it('does not run inactive policies', async () => {
    const devices = makeDevices(400, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, {
      event_types: ['trip_start'],
      vehicle_state: 'on_trip',
      speed: 4
    })
    await cache.seed({ devices, events, telemetry: [] })
    await Promise.all(devices.map(async device => db.writeDevice(device)))
    const inputs = await getAllInputs()
    const result = await processPolicy(EXPIRED_POLICY, geographies, inputs)
    test.assert.deepEqual(result, [])
  })
})

describe('Verifies compliance engine processes by vehicle most recent event', () => {
  beforeEach(async () => {
    await db.reinitialize()
    await cache.startup()
    await cache.reset()
  })
  it('should process count violation vehicles with the most recent event last', async () => {
    const devices = makeDevices(6, now())
    const start_time = now() - 10000000
    const latest_device: Device = devices[0]
    const events = devices.reduce((events_acc: VehicleEvent[], device: Device, current_index) => {
      const device_events = makeEventsWithTelemetry([device], start_time - current_index * 10, CITY_OF_LA, {
        event_types: ['trip_start'],
        vehicle_state: 'on_trip',
        speed: 0
      })
      events_acc.push(...device_events)
      return events_acc
    }, []) as VehicleEventWithTelemetry[]
    await cache.seed({ devices, events, telemetry: [] })
    await Promise.all(devices.map(async device => db.writeDevice(device)))
    const inputs = await getAllInputs()
    const complianceResults = await processPolicy(LOW_COUNT_POLICY, geographies, inputs)
    const { 0: result } = complianceResults.filter(
      complianceResult => complianceResult?.provider_id === TEST1_PROVIDER_ID
    ) as ComplianceSnapshotDomainModel[]
    test.assert.deepEqual(result.total_violations, 1)
    const { 0: device } = result.vehicles_found.filter(vehicle => {
      return !vehicle.rule_applied
    })
    test.assert.deepEqual(latest_device.device_id, device.device_id)
  })

  it('Verifies arbitrary event_types can be set for a state in a rule', async () => {
    const devices = makeDevices(6, now())
    const start_time = now() - 10000000
    const events = devices.reduce((events_acc: VehicleEvent[], device: Device, current_index) => {
      const device_events = makeEventsWithTelemetry([device], start_time - current_index * 10, CITY_OF_LA, {
        event_types: ['battery_low'],
        vehicle_state: 'available',
        speed: 0
      })
      events_acc.push(...device_events)
      return events_acc
    }, []) as VehicleEventWithTelemetry[]
    await cache.seed({ devices, events, telemetry: [] })
    await Promise.all(devices.map(async device => db.writeDevice(device)))
    const inputs = await getAllInputs()
    const complianceResults = processPolicy(ARBITRARY_EVENT_TYPES_POLICY, geographies, inputs)
    const { 0: result } = complianceResults.filter(
      complianceResult => complianceResult?.provider_id === TEST1_PROVIDER_ID
    ) as ComplianceSnapshotDomainModel[]
    test.assert.deepEqual(result.total_violations, 1)
  })

  it('Verifies no match when event types do not match policy', async () => {
    const devices = makeDevices(6, now())
    const start_time = now() - 10000000
    const events = devices.reduce((events_acc: VehicleEvent[], device: Device, current_index) => {
      const device_events = makeEventsWithTelemetry([device], start_time - current_index * 10, CITY_OF_LA, {
        event_types: ['reservation_cancel'],
        vehicle_state: 'available',
        speed: 0
      })
      events_acc.push(...device_events)
      return events_acc
    }, []) as VehicleEventWithTelemetry[]
    await cache.seed({ devices, events, telemetry: [] })
    await Promise.all(devices.map(async device => db.writeDevice(device)))
    const inputs = await getAllInputs()
    const complianceResults = processPolicy(ARBITRARY_EVENT_TYPES_POLICY, geographies, inputs)
    const { 0: result } = complianceResults.filter(
      complianceResult => complianceResult?.provider_id === TEST1_PROVIDER_ID
    )
    test.assert.deepEqual(result.total_violations, 0)
  })

  it('Verifies state wildcard matching works', async () => {
    const devices = makeDevices(11, now())
    const start_time = now() - 10000000
    const events = devices.reduce((events_acc: VehicleEvent[], device: Device, current_index) => {
      const device_events = makeEventsWithTelemetry([device], start_time - current_index * 10, CITY_OF_LA, {
        event_types: ['battery_low'],
        vehicle_state: 'available',
        speed: 0
      })
      events_acc.push(...device_events)
      return events_acc
    }, []) as VehicleEventWithTelemetry[]
    await cache.seed({ devices, events, telemetry: [] })
    await Promise.all(devices.map(async device => db.writeDevice(device)))
    const inputs = await getAllInputs()
    const complianceResults = processPolicy(COUNT_POLICY_JSON, geographies, inputs)
    const { 0: result } = complianceResults.filter(
      complianceResult => complianceResult?.provider_id === TEST1_PROVIDER_ID
    ) as ComplianceSnapshotDomainModel[]
    test.assert.deepEqual(result.total_violations, 1)
  })
})

describe('Verifies errors are being properly thrown', async () => {
  it('Verifies RuntimeErrors are being thrown with an invalid TIMEZONE env_var', async () => {
    const oldTimezone = process.env.TIMEZONE
    process.env.TIMEZONE = 'Pluto/Potato_Land'
    const devices = makeDevices(1, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, {
      event_types: ['trip_end'],
      vehicle_state: 'available',
      speed: 0
    })

    await cache.seed({ devices, events, telemetry: [] })
    await Promise.all(devices.map(async device => db.writeDevice(device)))

    await assert.rejects(
      async () => {
        const inputs = await getAllInputs()
        await processPolicy(policies[0], geographies, inputs)
      },
      { name: 'RuntimeError' }
    )
    process.env.TIMEZONE = oldTimezone
  })
})
