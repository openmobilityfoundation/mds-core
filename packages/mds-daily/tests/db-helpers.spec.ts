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

import db from '@mds-core/mds-db'
import Sinon from 'sinon'
import assert from 'assert'
import {
  getTripCountsSince,
  getEventCountsPerProviderSince,
  getTelemetryCountsPerProviderSince,
  getNumVehiclesRegisteredLast24Hours,
  getNumEventsLast24Hours,
  getConformanceLast24Hours
} from '../db-helpers'

/* eslint-disable promise/avoid-new */

describe('DB helpers for API', () => {
  describe('getTripCountsSince()', () => {
    it('computes correctly', async () => {
      const fakeRows: ReturnType<typeof db['getTripCountsPerProviderSince']> = new Promise(resolve => {
        resolve([
          {
            provider_id: 'fake-provider-id',
            count: 10
          }
        ])
      })
      Sinon.replace(db, 'getTripCountsPerProviderSince', Sinon.fake.returns(fakeRows))
      const provider_info = {}
      await getTripCountsSince({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail: Sinon.fake.returns('fake')
      })
      const expected_provider_info = { 'fake-provider-id': { trips_last_24h: 10 } }
      assert.deepStrictEqual(provider_info, expected_provider_info)
      Sinon.restore()
    })

    it('fails gracefully', async () => {
      Sinon.replace(db, 'getTripCountsPerProviderSince', Sinon.fake.rejects('fake-error'))
      const fail = Sinon.fake.returns('fake')
      const provider_info = {}
      await getTripCountsSince({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail
      })
      assert.equal(fail.called, true)
      Sinon.restore()
    })
  })

  describe('getEventCountsPerProviderSince()', () => {
    it('computes correctly', async () => {
      const fakeRows: ReturnType<typeof db['getEventCountsPerProviderSince']> = new Promise(resolve => {
        resolve([
          {
            provider_id: 'fake-provider-id',
            count: 10,
            event_type: 'fake-event-type',
            slacount: 10
          }
        ])
      })
      Sinon.replace(db, 'getEventCountsPerProviderSince', Sinon.fake.returns(fakeRows))
      const provider_info = {}
      await getEventCountsPerProviderSince({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail: Sinon.fake.returns('fake')
      })
      const expected_provider_info = {
        'fake-provider-id': {
          event_counts_last_24h: {
            'fake-event-type': 10
          },
          late_event_counts_last_24h: {
            'fake-event-type': 10
          }
        }
      }
      assert.deepStrictEqual(provider_info, expected_provider_info)
      Sinon.restore()
    })

    it('fails gracefully', async () => {
      Sinon.replace(db, 'getEventCountsPerProviderSince', Sinon.fake.rejects('fake-error'))
      const fail = Sinon.fake.returns('fake')
      const provider_info = {}
      await getEventCountsPerProviderSince({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail
      })
      assert.equal(fail.called, true)
      Sinon.restore()
    })
  })

  describe('getTelemetryCountsPerProviderSince()', () => {
    it('computes correctly', async () => {
      const fakeRows: ReturnType<typeof db['getTelemetryCountsPerProviderSince']> = new Promise(resolve => {
        resolve([
          {
            provider_id: 'fake-provider-id',
            count: 10,
            slacount: 10
          }
        ])
      })
      Sinon.replace(db, 'getTelemetryCountsPerProviderSince', Sinon.fake.returns(fakeRows))
      const provider_info = {}
      await getTelemetryCountsPerProviderSince({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail: Sinon.fake.returns('fake')
      })
      const expected_provider_info = {
        'fake-provider-id': {
          late_telemetry_counts_last_24h: 10,
          telemetry_counts_last_24h: 10
        }
      }
      assert.deepStrictEqual(provider_info, expected_provider_info)
      Sinon.restore()
    })

    it('fails gracefully', async () => {
      Sinon.replace(db, 'getTelemetryCountsPerProviderSince', Sinon.fake.rejects('fake-error'))
      const fail = Sinon.fake.returns('fake')
      const provider_info = {}
      await getTelemetryCountsPerProviderSince({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail
      })
      assert.equal(fail.called, true)
      Sinon.restore()
    })
  })

  describe('getNumVehiclesRegisteredLast24Hours()', () => {
    it('computes correctly', async () => {
      const fakeRows: ReturnType<typeof db['getNumVehiclesRegisteredLast24HoursByProvider']> = new Promise(resolve => {
        resolve([
          {
            provider_id: 'fake-provider-id',
            count: 10
          }
        ])
      })
      Sinon.replace(db, 'getNumVehiclesRegisteredLast24HoursByProvider', Sinon.fake.returns(fakeRows))
      const provider_info = {}
      await getNumVehiclesRegisteredLast24Hours({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail: Sinon.fake.returns('fake')
      })
      const expected_provider_info = {
        'fake-provider-id': {
          registered_last_24h: 10
        }
      }
      assert.deepStrictEqual(provider_info, expected_provider_info)
      Sinon.restore()
    })

    it('fails gracefully', async () => {
      Sinon.replace(db, 'getNumVehiclesRegisteredLast24HoursByProvider', Sinon.fake.rejects('fake-error'))
      const fail = Sinon.fake.returns('fake')
      const provider_info = {}
      await getNumVehiclesRegisteredLast24Hours({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail
      })
      assert.equal(fail.called, true)
      Sinon.restore()
    })
  })

  describe('getNumEventsLast24Hours()', () => {
    it('computes correctly', async () => {
      const fakeRows: ReturnType<typeof db['getNumEventsLast24HoursByProvider']> = new Promise(resolve => {
        resolve([
          {
            provider_id: 'fake-provider-id',
            count: 10
          }
        ])
      })
      Sinon.replace(db, 'getNumEventsLast24HoursByProvider', Sinon.fake.returns(fakeRows))
      const provider_info = {}
      await getNumEventsLast24Hours({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail: Sinon.fake.returns('fake')
      })
      const expected_provider_info = {
        'fake-provider-id': {
          events_last_24h: 10
        }
      }
      assert.deepStrictEqual(provider_info, expected_provider_info)
      Sinon.restore()
    })

    it('fails gracefully', async () => {
      Sinon.replace(db, 'getNumEventsLast24HoursByProvider', Sinon.fake.rejects('fake-error'))
      const fail = Sinon.fake.returns('fake')
      const provider_info = {}
      await getNumEventsLast24Hours({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail
      })
      assert.equal(fail.called, true)
      Sinon.restore()
    })
  })

  describe('getConformanceLast24Hours()', () => {
    it('computes correctly', async () => {
      const fakeRows: ReturnType<typeof db['getEventsLast24HoursPerProvider']> = new Promise(resolve => {
        resolve([
          {
            provider_id: 'fake-provider-id',
            device_id: 'fake-device-id',
            timestamp: 42,
            event_type: 'register',
            recorded: 42
          }
        ])
      })
      Sinon.replace(db, 'getEventsLast24HoursPerProvider', Sinon.fake.returns(fakeRows))
      const provider_info = {}
      await getConformanceLast24Hours({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail: Sinon.fake.returns('fake')
      })
      const expected_provider_info = {
        'fake-provider-id': {
          events_not_in_conformance: 0
        }
      }
      assert.deepStrictEqual(provider_info, expected_provider_info)
      Sinon.restore()
    })

    it('fails gracefully', async () => {
      Sinon.replace(db, 'getEventsLast24HoursPerProvider', Sinon.fake.rejects('fake-error'))
      const fail = Sinon.fake.returns('fake')
      const provider_info = {}
      await getConformanceLast24Hours({
        start_time: 10,
        end_time: 20,
        provider_info,
        fail
      })
      assert.equal(fail.called, true)
      Sinon.restore()
    })
  })
})
/* eslint-enable promise/avoid-new */
