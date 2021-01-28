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

import assert from 'assert'
import cache from '@mds-core/mds-agency-cache'
import Sinon from 'sinon'
import { categorizeTrips, TripsData, asInt, getMaps } from '../utils'

describe('MDS Daily utils', () => {
  describe('asInt()', () => {
    it('Converts string to number', () => {
      assert.equal(asInt('15'), 15)
    })

    it('Leaves number intact', () => {
      assert.equal(asInt(15), 15)
    })

    it('Handles undefined correctly', () => {
      assert.strictEqual(asInt(undefined), undefined)
    })
  })

  describe('categorizeTrips()', () => {
    it('Categorizes "sparse" trips data', () => {
      const tripsData: TripsData = {}
      const result = categorizeTrips(tripsData)
      const expected = {}
      assert.deepStrictEqual(result, expected)
    })

    it('Categorizes trips data', () => {
      const tripsData: TripsData = {
        'fake-trip-index': {
          provider_id: 'fake-provider-id',
          trip_id: 'fake-trip-id',
          eventTypes: {
            1: 'fake-event-data',
            10: 'fake-other-event-data'
          }
        }
      }
      const result = categorizeTrips(tripsData)
      const expected = {
        'fake-provider-id': {
          mysteries: {
            'fake-event-data-fake-other-event-data': 1
          },
          mystery: 1,
          mystery_examples: {
            'fake-event-data-fake-other-event-data': ['fake-trip-index']
          }
        }
      }
      assert.deepStrictEqual(result, expected)
    })
  })

  it('Computes event mapping correctly even with cache miss', async () => {
    Sinon.replace(cache, 'readAllEvents', Sinon.fake.resolves([null]))
    const maps = await getMaps()
    assert.deepStrictEqual(maps, { eventMap: {} })
  })
})
