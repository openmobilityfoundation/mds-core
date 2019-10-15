import test from 'unit.js'
import fs from 'fs'

import { makeDevices, makeEventsWithTelemetry } from '@mds-core/mds-test-data'
import { RULE_TYPES, Geography, Policy, Device } from '@mds-core/mds-types'

import { la_city_boundary } from '@mds-core/mds-policy/tests/la-city-boundary'
import { FeatureCollection } from 'geojson'
import { processPolicy, filterPolicies, filterEvents } from '@mds-core/mds-compliance/mds-compliance-engine'
import { ValidationError, RuntimeError } from '@mds-core/mds-utils'
import { validateEvents, validateGeographies, validatePolicies } from '../validators'

let policies: Policy[] = []

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

    const filteredEvents = filterEvents(events)
    const filteredPolicies = filterPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = filteredPolicies.map(policy => processPolicy(policy, filteredEvents, geographies, deviceMap))
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
    const devices = makeDevices(3000, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, 'trip_start')
    test.assert.doesNotThrow(() => validatePolicies(policies))
    test.assert.doesNotThrow(() => validateGeographies(geographies))
    test.assert.doesNotThrow(() => validateEvents(events))

    const filteredEvents = filterEvents(events)
    const filteredPolicies = filterPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = filteredPolicies.map(policy => processPolicy(policy, filteredEvents, geographies, deviceMap))

    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          if (
            compliance.matches &&
            compliance.rule.rule_type === RULE_TYPES.count &&
            compliance.rule.geographies.includes(CITY_OF_LA)
          ) {
            test.assert.notEqual(compliance.matches.length, 0)
          }
        })
        console.log('rezzy rez')
        console.log(result)
        test.assert(result.total_violations > 0)
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

    const filteredEvents = filterEvents(events)
    const filteredPolicies = filterPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = filteredPolicies.map(policy => processPolicy(policy, filteredEvents, geographies, deviceMap))

    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          if (
            compliance.matches &&
            compliance.rule.rule_type === RULE_TYPES.count &&
            compliance.rule.geographies.includes(CITY_OF_LA)
          ) {
            test.assert.notEqual(compliance.matches.length, 0)
          }
        })
        test.assert(result.total_violations > 0)
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

    const filteredEvents = filterEvents(events)
    const filteredPolicies = filterPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = filteredPolicies.map(policy => processPolicy(policy, filteredEvents, geographies, deviceMap))
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

    const filteredEvents = filterEvents(events)
    const filteredPolicies = filterPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = filteredPolicies.map(policy => processPolicy(policy, filteredEvents, geographies, deviceMap))
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

    const filteredEvents = filterEvents(events)
    const filteredPolicies = filterPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = filteredPolicies.map(policy => processPolicy(policy, filteredEvents, geographies, deviceMap))
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

    const filteredEvents = filterEvents(events)
    const filteredPolicies = filterPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = filteredPolicies.map(policy => processPolicy(policy, filteredEvents, geographies, deviceMap))
    results.forEach(result => {
      if (result) {
        result.compliance.forEach(compliance => {
          if (
            compliance.rule.geographies.includes(CITY_OF_LA) &&
            compliance.matches &&
            compliance.rule.rule_type === RULE_TYPES.time
          ) {
            test.assert.notEqual(compliance.matches.length, 0)
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

    const filteredEvents = filterEvents(events)

    test.assert.deepEqual(filteredEvents.length, 0)

    const filteredPolicies = filterPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    const results = filteredPolicies.map(policy => processPolicy(policy, filteredEvents, geographies, deviceMap))
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
    process.env.TIMEZONE = 'Pluto/Potato_Land'
    const devices = makeDevices(1, now())
    const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, 'trip_end')
    test.assert.doesNotThrow(() => validatePolicies(policies))
    test.assert.doesNotThrow(() => validateGeographies(geographies))
    test.assert.doesNotThrow(() => validateEvents(events))

    const filteredEvents = filterEvents(events)
    const filteredPolicies = filterPolicies(policies)
    const deviceMap: { [d: string]: Device } = devices.reduce(
      (deviceMapAcc: { [d: string]: Device }, device: Device) => {
        return Object.assign(deviceMapAcc, { [device.device_id]: device })
      },
      {}
    )
    test.assert.throws(
      () => filteredPolicies.map(policy => processPolicy(policy, filteredEvents, geographies, deviceMap)),
      RuntimeError
    )
    done()
  })
})
