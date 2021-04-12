/**
 * Copyright 2019 City of Los Angeles
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

import test from 'unit.js'
import assert from 'assert'
import {
  MICRO_MOBILITY_VEHICLE_EVENTS,
  MICRO_MOBILITY_VEHICLE_STATES,
  MICRO_MOBILITY_EVENT_STATES_MAP,
  MicroMobilityVehicleEvent
} from '@mds-core/mds-types'
import { routeDistance, isEventSequenceValid, normalizeToArray, filterDefined } from '../utils'
import { isEventValid, stateTransitionDict } from '../state-machine'

const Boston = { lat: 42.360081, lng: -71.058884 }
const LosAngeles = { lat: 34.052235, lng: -118.243683 }
const BostonToLA = 4169605.469765776

describe('Tests Utilities', () => {
  it('routeDistance: Verifies single point', done => {
    test.value(routeDistance([Boston])).is(0)
    done()
  })

  it('routeDistance: Verifies 2 points', done => {
    test.value(routeDistance([Boston, LosAngeles])).is(BostonToLA)
    done()
  })

  it('routeDistance: Verifies 2+ points', done => {
    test.value(routeDistance([Boston, LosAngeles, Boston])).is(BostonToLA * 2)
    done()
  })

  describe('Filter empty', () => {
    it('Filters out null/undefined elements', () => {
      const arr = [1, 2, null, 3, undefined, 4]
      const actual = arr.filter(filterDefined())
      const expected = [1, 2, 3, 4]
      assert.deepStrictEqual(actual, expected)
    })

    it('Does not filter 0 or "" (empty string) or [] (empty array)', () => {
      const arr = [1, 2, '', 3, [], 0]
      const actual = arr.filter(filterDefined())
      const expected = arr
      assert.deepStrictEqual(actual, expected)
    })

    // Can't seem to get TS to go along with Sinon.spy()
    // See https://sinonjs.org/releases/latest/spies/

    // it('Calls logger.warn', () => {
    //   const spy = Sinon.spy(logger.warn)
    //   const oldLogWarn = logger.warn
    //   logger.warn = spy

    //   const arr = [1, 2, null, 3, undefined, 4]
    //   const actual = arr.filter(filterDefined())
    //   const expected = [1, 2, 3, 4]
    //   assert.deepStrictEqual(actual, expected)
    //   assert.equal(spy.calledTwice, true)
    //   Sinon.restore()
    //   logger.warn = oldLogWarn
    // })
  })

  describe('Normalize to array', () => {
    it('Normalizes undefined to empty array', () => {
      assert.deepStrictEqual(normalizeToArray(undefined), [])
    })
    it('Normalizes single element into singleton array', () => {
      assert.deepStrictEqual(normalizeToArray('test'), ['test'])
    })
    it('Leaves array untouched', () => {
      assert.deepStrictEqual(normalizeToArray(['test1', 'test2']), ['test1', 'test2'])
    })
  })

  describe('State machine', () => {
    it('Tests state transitions', () => {
      const events = MICRO_MOBILITY_VEHICLE_EVENTS
      const states = MICRO_MOBILITY_VEHICLE_STATES
      for (const event_type_A of events) {
        for (const eventAState of states) {
          const eventA = { vehicle_state: eventAState, event_types: [event_type_A] } as MicroMobilityVehicleEvent
          assert.strictEqual(isEventValid(eventA), MICRO_MOBILITY_EVENT_STATES_MAP[event_type_A].includes(eventAState))
          for (const event_type_B of events) {
            for (const eventBState of states) {
              const eventB = { vehicle_state: eventBState, event_types: [event_type_B] } as MicroMobilityVehicleEvent
              assert.strictEqual(
                isEventValid(eventB),
                MICRO_MOBILITY_EVENT_STATES_MAP[event_type_B].includes(eventBState)
              )
              const actual = isEventSequenceValid(eventA, eventB)
              const transitionKey =
                `eventA :{ vehicle_state: ${eventAState}, event_types: [${event_type_A}] }, ` +
                `eventB: { vehicle_state: ${eventBState}, event_types: [${event_type_B} }]`
              const stateTransitionValidity = !!stateTransitionDict[eventAState][event_type_B]?.includes(eventBState)
              assert.strictEqual(actual, stateTransitionValidity, transitionKey)
            }
          }
        }
      }
    })

    it('isEventSequenceValid returns true when there are multiple valid event_types in an event', () => {
      const eventA = { vehicle_state: 'on_trip', event_types: ['trip_start'] } as MicroMobilityVehicleEvent
      const eventB = {
        vehicle_state: 'unknown',
        event_types: ['trip_leave_jurisdiction', 'comms_lost']
      } as MicroMobilityVehicleEvent
      assert(isEventSequenceValid(eventA, eventB))
    })

    it('isEventSequenceValid returns false when the multiple event_types are invalid', () => {
      const eventA = { vehicle_state: 'on_trip', event_types: ['trip_start'] } as MicroMobilityVehicleEvent
      const eventB = {
        vehicle_state: 'unknown',
        event_types: ['comms_lost', 'comms_lost']
      } as MicroMobilityVehicleEvent
      assert(!isEventSequenceValid(eventA, eventB))
    })
  })
})
