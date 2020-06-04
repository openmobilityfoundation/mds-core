import test from 'unit.js'
import fs from 'fs'

import { makeDevices, makeEventsWithTelemetry } from '@mds-core/mds-test-data'
import { RULE_TYPES, Geography, Policy, Device, VehicleEvent } from '@mds-core/mds-types'

import { la_city_boundary } from '@mds-core/mds-policy/tests/la-city-boundary'
import { FeatureCollection } from 'geojson'
import { processPolicy, getSupersedingPolicies, getRecentEvents } from '@mds-core/mds-compliance/mds-compliance-engine'
import { RuntimeError } from '@mds-core/mds-utils'
import { ValidationError, validateEvents, validateGeographies, validatePolicies } from '@mds-core/mds-schema-validators'

let policies: Policy[] = []
let low_count_policies: Policy[] = []

const CITY_OF_LA = '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'

const geographies: Geography[] = [
  { name: 'la', geography_id: CITY_OF_LA, geography_json: la_city_boundary as FeatureCollection }
]

process.env.TIMEZONE = 'America/Los_Angeles'

function now(): number {
  return Date.now()
}

async function readJson(path: string): Promise<Policy[]> {
  return Promise.resolve(JSON.parse(fs.readFileSync(path).toString()))
}

function getDeviceMap(devices: Device[]): { [d: string]: Device } {
  return devices.reduce((deviceMapAcc: { [d: string]: Device }, device: Device) => {
    return Object.assign(deviceMapAcc, { [device.device_id]: device })
  }, {})
}

describe('Tests Compliance Engine', () => {
  before(async () => {
    policies = await readJson('test_data/policies.json')
    // geographies = await readJson('test_data/geographies.json')
  })

  // it('Verify Devices Schema Compliance', done => {
  //   const devices = makeDevices(5, now())
  //   test.assert.equal(validateSchemaCompliance(devices, devices_schema), devices.devices)
  //   done()
  // })

  it('Verify Events Schema Compliance', done => {
    const devices = makeDevices(5, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA)
    test.assert.doesNotThrow(() => validateEvents(events))
    done()
  })

  it('Verifies count compliance', done => {
    const devices = makeDevices(800, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, 'trip_start')
    test.assert.doesNotThrow(() => validatePolicies(policies))
    test.assert.doesNotThrow(() => validateGeographies(geographies))
    test.assert.doesNotThrow(() => validateEvents(events))

    const recentEvents = getRecentEvents(events)
    const supersedingPolicies = getSupersedingPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = supersedingPolicies.map(policy => processPolicy(policy, recentEvents, geographies, deviceMap))
    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          if (compliance.matches && compliance.rule.rule_type === RULE_TYPES.count) {
            test.assert.deepEqual(compliance.matches.length, 1)
          }
        })
      }
    })
    done()
  })

  it('Verifies count compliance maximum violation', done => {
    const devices = makeDevices(3001, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, 'trip_start')
    test.assert.doesNotThrow(() => validatePolicies(policies))
    test.assert.doesNotThrow(() => validateGeographies(geographies))
    test.assert.doesNotThrow(() => validateEvents(events))

    const recentEvents = getRecentEvents(events)
    const supersedingPolicies = getSupersedingPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = supersedingPolicies.map(policy => processPolicy(policy, recentEvents, geographies, deviceMap))

    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          if (
            compliance.matches &&
            compliance.rule.rule_type === RULE_TYPES.count &&
            compliance.rule.geographies.includes(CITY_OF_LA)
          ) {
            test.assert.notEqual(compliance.matches.length, 0)
            test.assert.deepEqual(result.total_violations, 1)
          }
        })
      }
    })
    done()
  })

  it('Verifies count compliance minimum violation', done => {
    const devices = makeDevices(10, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, 'trip_start')
    test.assert.doesNotThrow(() => validatePolicies(policies))
    test.assert.doesNotThrow(() => validateGeographies(geographies))
    test.assert.doesNotThrow(() => validateEvents(events))

    const recentEvents = getRecentEvents(events)
    const supersedingPolicies = getSupersedingPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = supersedingPolicies.map(policy => processPolicy(policy, recentEvents, geographies, deviceMap))

    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          if (
            compliance.matches &&
            compliance.rule.rule_type === RULE_TYPES.count &&
            compliance.rule.geographies.includes(CITY_OF_LA)
          ) {
            test.assert.notEqual(compliance.matches.length, 0)
            test.assert.deepEqual(result.total_violations, 490)
          }
        })
      }
    })
    done()
  })

  it('Verifies speed compliance', done => {
    const devices = makeDevices(5, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, 'trip_start', 5)
    test.assert.doesNotThrow(() => validatePolicies(policies))
    test.assert.doesNotThrow(() => validateGeographies(geographies))
    test.assert.doesNotThrow(() => validateEvents(events))

    const recentEvents = getRecentEvents(events)
    const supersedingPolicies = getSupersedingPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = supersedingPolicies.map(policy => processPolicy(policy, recentEvents, geographies, deviceMap))
    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          if (
            compliance.rule.geographies.includes(CITY_OF_LA) &&
            compliance.matches &&
            compliance.rule.rule_type === RULE_TYPES.speed
          ) {
            test.assert.deepEqual(compliance.matches.length, 0)
          }
        })
      }
    })
    done()
  })

  it('Verifies speed compliance violation', done => {
    const devices = makeDevices(5, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, 'trip_start', 500)
    test.assert.doesNotThrow(() => validatePolicies(policies))
    test.assert.doesNotThrow(() => validateGeographies(geographies))
    test.assert.doesNotThrow(() => validateEvents(events))

    const recentEvents = getRecentEvents(events)
    const supersedingPolicies = getSupersedingPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = supersedingPolicies.map(policy => processPolicy(policy, recentEvents, geographies, deviceMap))
    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          if (
            compliance.rule.geographies.includes(CITY_OF_LA) &&
            compliance.matches &&
            compliance.rule.rule_type === RULE_TYPES.speed
          ) {
            test.assert.deepEqual(compliance.matches.length, 5)
            test.assert.deepEqual(result.total_violations, 5)
          }
        })
      }
    })
    done()
  })

  it('Verifies time compliance', done => {
    const devices = makeDevices(400, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, 'trip_end')
    test.assert.doesNotThrow(() => validatePolicies(policies))
    test.assert.doesNotThrow(() => validateGeographies(geographies))
    test.assert.doesNotThrow(() => validateEvents(events))

    const recentEvents = getRecentEvents(events)
    const supersedingPolicies = getSupersedingPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = supersedingPolicies.map(policy => processPolicy(policy, recentEvents, geographies, deviceMap))
    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          if (
            compliance.rule.geographies.includes(CITY_OF_LA) &&
            compliance.matches &&
            compliance.rule.rule_type === RULE_TYPES.time
          ) {
            test.assert.deepEqual(compliance.matches.length, 0)
          }
        })
      }
    })
    done()
  })

  it('Verifies time compliance violation', done => {
    const devices = makeDevices(400, now())
    const events = makeEventsWithTelemetry(devices, now() - 10000000, CITY_OF_LA, 'trip_end')
    test.assert.doesNotThrow(() => validatePolicies(policies))
    test.assert.doesNotThrow(() => validateGeographies(geographies))
    test.assert.doesNotThrow(() => validateEvents(events))

    const recentEvents = getRecentEvents(events)
    const supersedingPolicies = getSupersedingPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = supersedingPolicies.map(policy => processPolicy(policy, recentEvents, geographies, deviceMap))
    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          if (
            compliance.rule.geographies.includes(CITY_OF_LA) &&
            compliance.matches &&
            compliance.rule.rule_type === RULE_TYPES.time
          ) {
            test.assert.notEqual(compliance.matches.length, 0)
            test.assert.deepEqual(result.total_violations, 400)
          }
        })
      }
    })
    done()
  })

  it('Verifies not considering events older than 48 hours', done => {
    const TWO_DAYS_IN_MS = 172800000
    const devices = makeDevices(400, now())
    const events = makeEventsWithTelemetry(devices, now() - TWO_DAYS_IN_MS, CITY_OF_LA, 'trip_end')
    test.assert.doesNotThrow(() => validatePolicies(policies))
    test.assert.doesNotThrow(() => validateGeographies(geographies))
    test.assert.doesNotThrow(() => validateEvents(events))

    const recentEvents = getRecentEvents(events)

    test.assert.deepEqual(recentEvents.length, 0)

    const supersedingPolicies = getSupersedingPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = supersedingPolicies.map(policy => processPolicy(policy, recentEvents, geographies, deviceMap))
    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          if (
            compliance.rule.geographies.includes(CITY_OF_LA) &&
            compliance.matches &&
            compliance.rule.rule_type === RULE_TYPES.time
          ) {
            test.assert.deepEqual(compliance.matches.length, 0)
          }
        })
      }
    })
    done()
  })
})

describe('Verifies errors are being properly thrown', () => {
  it('Verify garbage does not pass schema compliance', done => {
    const devices = { foo: { potato: 'POTATO!' } }
    test.assert.throws(() => validateEvents(devices), ValidationError)
    done()
  })

  it('Verifies RuntimeErrors are being thrown with an invalid TIMEZONE env_var', done => {
    const oldTimezone = process.env.TIMEZONE
    process.env.TIMEZONE = 'Pluto/Potato_Land'
    const devices = makeDevices(1, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, 'trip_end')
    test.assert.doesNotThrow(() => validatePolicies(policies))
    test.assert.doesNotThrow(() => validateGeographies(geographies))
    test.assert.doesNotThrow(() => validateEvents(events))

    const recentEvents = getRecentEvents(events)
    const supersedingPolicies = getSupersedingPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    test.assert.throws(
      () => supersedingPolicies.map(policy => processPolicy(policy, recentEvents, geographies, deviceMap)),
      RuntimeError
    )
    process.env.TIMEZONE = oldTimezone
    done()
  })
})

describe('Verifies compliance engine processes by vehicle most recent event', async () => {
  before(async () => {
    low_count_policies = await readJson('test_data/low_limit_policy.json')
    // geographies = await readJson('test_data/geographies.json')
  })

  it('should process count violation vehicles with the most recent event last', done => {
    test.assert.doesNotThrow(() => validatePolicies(low_count_policies))
    const devices = makeDevices(6, now())
    const start_time = now() - 10000000
    const latest_device: Device = devices[0]
    const events: VehicleEvent[] = devices.reduce((events_acc: VehicleEvent[], device: Device, current_index) => {
      const device_events = makeEventsWithTelemetry([device], start_time - current_index * 10, CITY_OF_LA, 'trip_start')
      events_acc.push(...device_events)
      return events_acc
    }, [])
    const deviceMap = getDeviceMap(devices)
    const results = low_count_policies.map(policy => processPolicy(policy, events, geographies, deviceMap))
    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          // It's not necessary to verify it works for the other rule types since the sorting happens before
          // any policy processing happens.
          if (
            compliance.rule.geographies.includes(CITY_OF_LA) &&
            compliance.matches &&
            compliance.rule.rule_type === RULE_TYPES.count
          ) {
            test.assert.deepEqual(compliance.matches.length, 1)
            test.assert.deepEqual(result.vehicles_in_violation[0].device_id, latest_device.device_id)
          }
        })
      }
    })
    done()
  })
})
