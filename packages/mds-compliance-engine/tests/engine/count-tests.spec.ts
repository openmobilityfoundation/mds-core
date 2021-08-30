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

/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/no-callback-in-promise */
/* eslint-disable promise/no-nesting */
/* eslint-disable promise/always-return */
/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  LA_CITY_BOUNDARY,
  makeDevices,
  makeEventsWithTelemetry,
  makeTelemetryInArea,
  veniceSpecOps
} from '@mds-core/mds-test-data'
import { CountRule, Device, Geography, Policy, RULE_TYPES, Telemetry, UUID, VehicleEvent } from '@mds-core/mds-types'
import { now, rangeRandomInt, uuid } from '@mds-core/mds-utils'
import { Feature, FeatureCollection } from 'geojson'
import MockDate from 'mockdate'
import test from 'unit.js'
import { ComplianceEngineResult, VehicleEventWithTelemetry } from '../../@types'
import { isCountRuleMatch, processCountPolicy } from '../../engine/count_processors'
import { generateDeviceMap } from '../../engine/helpers'
import {
  CITY_OF_LA,
  COUNT_POLICY_JSON,
  COUNT_POLICY_JSON_2,
  COUNT_POLICY_JSON_3,
  COUNT_POLICY_JSON_5,
  HIGH_COUNT_POLICY,
  INNER_GEO,
  INNER_POLYGON,
  INNER_POLYGON_2,
  LA_BEACH,
  LA_BEACH_GEOGRAPHY,
  LA_GEOGRAPHY,
  MANY_OVERFLOWS_POLICY,
  OUTER_GEO,
  RESTRICTED_GEOGRAPHY,
  TANZANIA_GEO,
  TANZANIA_POLYGON,
  TEST_ZONE_NO_VALID_DROP_OFF_POINTS,
  VENICE_MIXED_VIOLATIONS_POLICY,
  VENICE_OVERFLOW_POLICY,
  VENICE_POLICY_UUID
} from '../../test_data/fixtures'

process.env.TIMEZONE = 'America/Los_Angeles'
const COUNT_POLICY = {
  policy_id: '221975ef-569c-40a1-a9b0-646e6155c764',
  name: 'LADOT Pilot Caps',
  description: 'LADOT Pilot Caps (add description)',
  start_date: 1552678594428,
  end_date: null,
  prev_policies: null,
  provider_ids: null,
  rules: [
    {
      name: 'Greater LA',
      rule_id: '47c8c7d4-14b5-43a3-b9a5-a32ecc2fb2c6',
      rule_type: 'count',
      geographies: ['1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'],
      states: {
        available: [],
        on_trip: []
      },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 3000,
      minimum: 500
    }
  ]
}

const GEOGRAPHIES = [{ name: 'la', geography_id: CITY_OF_LA, geography_json: LA_CITY_BOUNDARY as FeatureCollection }]

describe('Tests Compliance Engine Count Functionality:', () => {
  describe('basic count compliance cases', () => {
    it('isCountRuleMatch is accurate', done => {
      const LAdevices: Device[] = makeDevices(1, now())
      const LAevents = makeEventsWithTelemetry(LAdevices, now(), CITY_OF_LA, {
        event_types: ['trip_end'],
        vehicle_state: 'available',
        speed: rangeRandomInt(10)
      })

      const TZDevices: Device[] = makeDevices(1, now())
      const TZEvents = makeEventsWithTelemetry(TZDevices, now(), TANZANIA_POLYGON, {
        event_types: ['trip_end'],
        vehicle_state: 'available',
        speed: rangeRandomInt(10)
      })

      test.assert(
        isCountRuleMatch(
          COUNT_POLICY.rules[0] as CountRule,
          GEOGRAPHIES,
          LAdevices[0],
          LAevents[0] as VehicleEvent & { telemetry: Telemetry }
        )
      )
      test.assert(
        !isCountRuleMatch(
          COUNT_POLICY.rules[0] as CountRule,
          GEOGRAPHIES,
          TZDevices[0],
          TZEvents[0] as VehicleEvent & { telemetry: Telemetry }
        )
      )
      done()
    })

    it('reports 0 violations if the number of vehicles is below the count limit', done => {
      const devices: Device[] = makeDevices(7, now())
      const events = makeEventsWithTelemetry(devices, now() - 100000, CITY_OF_LA, {
        event_types: ['trip_end'],
        vehicle_state: 'available',
        speed: rangeRandomInt(10)
      })
      const telemetry: Telemetry[] = []
      devices.forEach(device => {
        telemetry.push(makeTelemetryInArea(device, now(), CITY_OF_LA, 10))
      })
      const deviceMap = generateDeviceMap(devices)
      const resultNew = processCountPolicy(
        COUNT_POLICY_JSON,
        events as (VehicleEvent & { telemetry: Telemetry })[],
        [LA_GEOGRAPHY],
        deviceMap
      ) as ComplianceEngineResult
      test.assert.deepEqual(resultNew.total_violations, 0)
      done()
    })

    it('Verifies count compliance', done => {
      const devices = makeDevices(800, now())
      const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, {
        event_types: ['trip_start'],
        vehicle_state: 'on_trip',
        speed: 0
      }) as VehicleEventWithTelemetry[]

      const deviceMap: { [d: string]: Device } = generateDeviceMap(devices)

      const result = processCountPolicy(HIGH_COUNT_POLICY, events, [LA_GEOGRAPHY], deviceMap) as ComplianceEngineResult
      test.assert.deepEqual(result.total_violations, 0)
      test.assert.deepEqual(result.vehicles_found.length, 800)
      done()
    })

    it('Verifies count compliance maximum violation', done => {
      const devices = makeDevices(3001, now())
      const events = makeEventsWithTelemetry(devices, now(), CITY_OF_LA, {
        event_types: ['trip_start'],
        vehicle_state: 'on_trip',
        speed: 0
      }) as VehicleEventWithTelemetry[]

      const deviceMap: { [d: string]: Device } = generateDeviceMap(devices)

      const result = processCountPolicy(HIGH_COUNT_POLICY, events, [LA_GEOGRAPHY], deviceMap) as ComplianceEngineResult
      test.assert.deepEqual(result.total_violations, 1)
      test.assert.deepEqual(result.vehicles_found.length, 3001)

      done()
    })

    it('Verifies count compliance minimum violation', done => {
      const matchingDevices = makeDevices(10, now())
      const notMatchingDevices = makeDevices(10, now())
      const matchingEvents = makeEventsWithTelemetry(matchingDevices, now(), CITY_OF_LA, {
        event_types: ['trip_start'],
        vehicle_state: 'on_trip',
        speed: 0
      }) as VehicleEventWithTelemetry[]

      const notMatchingEvents = makeEventsWithTelemetry(notMatchingDevices, now(), CITY_OF_LA, {
        event_types: ['unspecified'],
        vehicle_state: 'unknown',
        speed: 0
      }) as VehicleEventWithTelemetry[]

      const deviceMap: { [d: string]: Device } = generateDeviceMap([...matchingDevices, ...notMatchingDevices])
      const result = processCountPolicy(
        HIGH_COUNT_POLICY,
        [...matchingEvents, ...notMatchingEvents],
        GEOGRAPHIES,
        deviceMap
      ) as ComplianceEngineResult

      test.assert.deepEqual(result.total_violations, 490)
      test.assert.deepEqual(result.vehicles_found.length, 10)
      done()
    })
  })

  describe('Verifies day-based bans work properly', () => {
    it('Reports violations accurately', done => {
      const devices: Device[] = makeDevices(15, now())
      const events = makeEventsWithTelemetry(devices, now() - 10, LA_BEACH, {
        event_types: ['trip_end'],
        vehicle_state: 'available',
        speed: rangeRandomInt(10)
      }) as VehicleEventWithTelemetry[]

      const telemetry: Telemetry[] = []
      devices.forEach(device => {
        telemetry.push(makeTelemetryInArea(device, now(), LA_BEACH, 10))
      })
      const TuesdayDeviceMap = generateDeviceMap(devices)
      const SaturdayDeviceMap = generateDeviceMap(devices)

      // Verifies on a Tuesday that vehicles are allowed
      MockDate.set('2019-05-21T20:00:00.000Z')
      const tuesdayResult = processCountPolicy(
        COUNT_POLICY_JSON_2,
        events,
        [LA_BEACH_GEOGRAPHY],
        TuesdayDeviceMap
      ) as ComplianceEngineResult
      test.assert(tuesdayResult.total_violations === 0)
      // Verifies on a Saturday that vehicles are banned
      MockDate.set('2019-05-25T20:00:00.000Z')
      const saturdayResult = processCountPolicy(
        COUNT_POLICY_JSON_2,
        events,
        [LA_BEACH_GEOGRAPHY],
        SaturdayDeviceMap
      ) as ComplianceEngineResult
      test.assert(saturdayResult.total_violations === 15)
      MockDate.reset()
      done()
    })
  })

  describe('Verify that rules written for a particular event_type only apply to events of that event_type', () => {
    it('Verifies violations for on_hours events', () => {
      const devices: Device[] = makeDevices(15, now())
      const events = makeEventsWithTelemetry(devices, now() - 100000, CITY_OF_LA, {
        event_types: ['on_hours'],
        vehicle_state: 'available',
        speed: 0
      }) as VehicleEventWithTelemetry[]
      const deviceMap = generateDeviceMap(devices)
      const result = processCountPolicy(
        COUNT_POLICY_JSON_3,
        events,
        [LA_GEOGRAPHY],
        deviceMap
      ) as ComplianceEngineResult

      test.assert.deepEqual(result.vehicles_found.length, 15)
      test.assert.deepEqual(result.total_violations, 5)
    })

    it('Verifies no violations for a different event_type', done => {
      const devices: Device[] = makeDevices(15, now())
      const events = makeEventsWithTelemetry(devices, now() - 100000, CITY_OF_LA, {
        event_types: ['trip_end'],
        vehicle_state: 'available',
        speed: 0
      }) as VehicleEventWithTelemetry[]

      const deviceMap = generateDeviceMap(devices)
      const result = processCountPolicy(
        COUNT_POLICY_JSON_3,
        events,
        [LA_GEOGRAPHY],
        deviceMap
      ) as ComplianceEngineResult
      test.assert.deepEqual(result.total_violations, 0)
      done()
    })
  })

  describe('Verifies max 0 count policy', () => {
    it('exercises the max 0 compliance', done => {
      const devices: Device[] = makeDevices(15, now())
      const events = makeEventsWithTelemetry(devices, now() - 10, LA_BEACH, {
        event_types: ['trip_start'],
        vehicle_state: 'on_trip',
        speed: 0
      }) as VehicleEventWithTelemetry[]

      const deviceMap = generateDeviceMap(devices)
      const result = processCountPolicy(
        COUNT_POLICY_JSON_5,
        events,
        [RESTRICTED_GEOGRAPHY],
        deviceMap
      ) as ComplianceEngineResult

      test.assert.deepEqual(result.total_violations, 15)
      done()
    })
  })

  describe('Verifies count logic behaves properly when one geography is contained in another', () => {
    it('has the correct number of matches per rule', done => {
      const veniceSpecOpsPointIds: UUID[] = []
      const geographies = veniceSpecOps.features.map((feature: Feature) => {
        if (feature.geometry.type === 'Point') {
          const geography_id = uuid()
          // points where drop-offs are allowed
          veniceSpecOpsPointIds.push(geography_id)
          return {
            geography_id,
            geography_json: feature.geometry
          }
        }
        // larger zone wherein drop-offs are banned
        return {
          geography_id: 'e0e4a085-7a50-43e0-afa4-6792ca897c5a',
          geography_json: feature.geometry
        }
      }) as unknown as Geography[]

      const VENICE_SPEC_OPS_POLICY: Policy = {
        name: 'Venice Special Operations Zone',
        description: 'LADOT Venice Drop-off/no-fly zones',
        policy_id: VENICE_POLICY_UUID,
        start_date: 1558389669540,
        publish_date: 1558389669540,
        end_date: null,
        prev_policies: null,
        provider_ids: [],
        rules: [
          {
            // no maximum set for this rule means an arbitrary number of vehicles can be dropped off here
            name: 'Valid Provider Drop Offs',
            rule_id: '7a043ac8-03cd-4b0d-9588-d0af24f82832',
            rule_type: RULE_TYPES.count,
            geographies: veniceSpecOpsPointIds,
            states: { available: ['provider_drop_off'] },
            vehicle_types: ['bicycle', 'scooter']
          },
          {
            name: 'Drop-off No-Fly Zones',
            rule_id: '596d7fe1-53fd-4ea4-8ba7-33f5ea8d98a6',
            rule_type: RULE_TYPES.count,
            geographies: ['e0e4a085-7a50-43e0-afa4-6792ca897c5a'],
            states: { available: ['provider_drop_off'] },
            vehicle_types: ['bicycle', 'scooter'],
            maximum: 0
          }
        ]
      }

      const devices_a: Device[] = makeDevices(22, now())
      let iter = 0
      const events_a: VehicleEvent[] = veniceSpecOps.features.reduce((acc: VehicleEvent[], feature: Feature) => {
        if (feature.geometry.type === 'Point') {
          acc.push(
            ...makeEventsWithTelemetry([devices_a[iter++]], now() - 10, feature.geometry, {
              event_types: ['provider_drop_off'],
              vehicle_state: 'available',
              speed: 0
            })
          )
        }
        return acc
      }, [])

      const devices_b: Device[] = makeDevices(10, now())
      const events_b: VehicleEvent[] = makeEventsWithTelemetry(
        devices_b,
        now() - 10,
        TEST_ZONE_NO_VALID_DROP_OFF_POINTS,
        {
          event_types: ['provider_drop_off'],
          vehicle_state: 'available',
          speed: 0
        }
      )

      const deviceMap: { [d: string]: Device } = generateDeviceMap([...devices_a, ...devices_b])
      const result = processCountPolicy(
        VENICE_SPEC_OPS_POLICY,
        [...events_a, ...events_b] as VehicleEventWithTelemetry[],
        geographies,
        deviceMap
      ) as ComplianceEngineResult
      test.assert(result.total_violations === 10)
      done()
    })

    it('does overflow correctly', done => {
      /* The polygons within which these events are being created do not overlap
       with each other at all. They are both contained within the greater Venice
       geography. The devices in INNER_POLYGON should overflow into the rule evaluation
       for the second rule.
       */
      const devices_a: Device[] = makeDevices(3, now())
      const events_a: VehicleEvent[] = makeEventsWithTelemetry(devices_a, now(), INNER_POLYGON, {
        event_types: ['provider_drop_off'],
        vehicle_state: 'available',
        speed: 0
      })

      const devices_b: Device[] = makeDevices(2, now())
      const events_b: VehicleEvent[] = makeEventsWithTelemetry(devices_b, now(), INNER_POLYGON_2, {
        event_types: ['provider_drop_off'],
        vehicle_state: 'available',
        speed: 0
      })

      const deviceMap: { [d: string]: Device } = generateDeviceMap([...devices_a, ...devices_b])
      const result = processCountPolicy(
        VENICE_OVERFLOW_POLICY,
        [...events_a, ...events_b] as VehicleEventWithTelemetry[],
        [INNER_GEO, OUTER_GEO],
        deviceMap
      ) as ComplianceEngineResult

      const rule_0_id = VENICE_OVERFLOW_POLICY.rules[0].rule_id
      const rule_1_id = VENICE_OVERFLOW_POLICY.rules[1].rule_id
      const { vehicles_found } = result

      const violatingVehicles = vehicles_found.filter(vehicle => !!vehicle.rule_applied)
      const vehiclesCapturedByRule0 = vehicles_found.filter(
        vehicle =>
          vehicle.rule_applied === rule_0_id &&
          vehicle.rules_matched.includes(rule_0_id) &&
          vehicle.rules_matched.includes(rule_1_id)
      )
      const vehiclesCapturedByRule1 = vehicles_found.filter(
        vehicle => vehicle.rule_applied === rule_1_id && vehicle.rules_matched.includes(rule_1_id)
      )

      test.assert(vehiclesCapturedByRule0.length === 1)
      test.assert(vehiclesCapturedByRule1.length === 2)

      const vehiclesMatchingBothRules = vehicles_found.filter(
        vehicle => vehicle.rules_matched.includes(rule_0_id) && vehicle.rules_matched.includes(rule_1_id)
      )
      test.assert(vehiclesMatchingBothRules.length === 3)

      violatingVehicles.forEach(vehicle => {
        test.assert(vehicle.rules_matched.includes(VENICE_OVERFLOW_POLICY.rules[1].rule_id))
      })

      test.assert.equal(result.total_violations, 2)
      done()
    })
  })

  it('counts total_violations accurately when mixing count minumum and maximum violations', done => {
    // The polygons within which these events are being created do not overlap
    // with each other at all.
    const devices_a: Device[] = makeDevices(3, now())
    const events_a: VehicleEvent[] = makeEventsWithTelemetry(devices_a, now() - 10, INNER_POLYGON, {
      event_types: ['provider_drop_off'],
      vehicle_state: 'available',
      speed: 0
    })

    const devices_b: Device[] = makeDevices(2, now())
    const events_b: VehicleEvent[] = makeEventsWithTelemetry(devices_b, now() - 10, INNER_POLYGON_2, {
      event_types: ['provider_drop_off'],
      vehicle_state: 'available',
      speed: 0
    })

    // The geo of the first rule is contained within the geo of the second rule.
    const deviceMap: { [d: string]: Device } = generateDeviceMap([...devices_a, ...devices_b])
    const result = processCountPolicy(
      VENICE_MIXED_VIOLATIONS_POLICY,
      [...events_a, ...events_b] as VehicleEventWithTelemetry[],
      [INNER_GEO, OUTER_GEO],
      deviceMap
    ) as ComplianceEngineResult

    test.assert.equal(result.total_violations, 6)
    done()
  })

  it('accurately tracks overflows per rule and marks each vehicle_found with the rules that apply or match', done => {
    // The polygons within which these events are being created do not overlap
    // with each other at all.
    const devices_a: Device[] = makeDevices(2, now())
    const events_a: VehicleEvent[] = makeEventsWithTelemetry(devices_a, now() - 10, INNER_POLYGON, {
      event_types: ['provider_drop_off'],
      vehicle_state: 'available',
      speed: 0
    })

    const devices_b: Device[] = makeDevices(4, now())
    const events_b: VehicleEvent[] = makeEventsWithTelemetry(devices_b, now() - 10, TANZANIA_POLYGON, {
      event_types: ['provider_drop_off'],
      vehicle_state: 'available',
      speed: 0
    })
    const deviceMap: { [d: string]: Device } = generateDeviceMap([...devices_a, ...devices_b])
    const result = processCountPolicy(
      MANY_OVERFLOWS_POLICY,
      [...events_a, ...events_b] as VehicleEventWithTelemetry[],
      [INNER_GEO, TANZANIA_GEO],
      deviceMap
    ) as ComplianceEngineResult

    /* If there was a problem with the overflow logic, then the violation
     * from the first rule would have overflowed into evaluation for the
     * second rule, and there would be no violations at all.
     */
    test.assert.equal(result.total_violations, 1)
    const rule_0_id = MANY_OVERFLOWS_POLICY.rules[0].rule_id
    const rule_1_id = MANY_OVERFLOWS_POLICY.rules[1].rule_id

    const rule_0_applied = result.vehicles_found.filter(vehicle => {
      return vehicle.rule_applied === rule_0_id && vehicle.rules_matched.includes(rule_0_id)
    }).length
    test.assert.deepEqual(rule_0_applied, 1)
    const rule_0_matched = result.vehicles_found.filter(vehicle => {
      return vehicle.rules_matched.includes(rule_0_id)
    }).length
    test.assert.deepEqual(rule_0_matched, 2)
    const rule_0_overflowed = result.vehicles_found.filter(vehicle => {
      return vehicle.rules_matched.includes(rule_0_id) && !!vehicle.rule_applied
    }).length
    test.assert.deepEqual(rule_0_overflowed, 1)

    const rule_1_applied = result.vehicles_found.filter(vehicle => {
      return vehicle.rule_applied === rule_1_id && vehicle.rules_matched.includes(rule_1_id)
    }).length
    test.assert.deepEqual(rule_1_applied, 4)
    const rule_1_matched = result.vehicles_found.filter(vehicle => {
      return vehicle.rules_matched.includes(rule_1_id)
    }).length
    test.assert.deepEqual(rule_1_matched, 4)
    done()
  })
})
