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

// eslint directives:
/* eslint-disable no-plusplus */
/* eslint-disable no-useless-concat */
/* eslint-disable prefer-destructuring */

import supertest from 'supertest'
import test from 'unit.js'
import { VEHICLE_EVENTS } from 'mds-enums'
import { Timestamp, Device, VehicleEvent, Telemetry } from 'mds'
import db from 'mds-db'
import cache from 'mds-cache'
import { makeDevices } from 'mds-test-data'
import { server } from 'mds-api-server'
import { TEST1_PROVIDER_ID } from 'mds-providers'
import { api } from '../api'

process.env.PATH_PREFIX = '/agency'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(server(api))

function now(): Timestamp {
  return Date.now()
}

const APP_JSON = 'application/json; charset=utf-8'

const PROVIDER_SCOPES = 'admin:all test:all'
const DEVICE_UUID = 'ec551174-f324-4251-bfed-28d9f3f473fc'
const TRIP_UUID = '1f981864-cc17-40cf-aea3-70fd985e2ea7'
const TEST_TELEMETRY: Telemetry = {
  provider_id: TEST1_PROVIDER_ID,
  device_id: DEVICE_UUID,
  gps: {
    lat: 37.3382,
    lng: -121.8863,
    speed: 0,
    hdop: 1,
    heading: 180
  },
  charge: 0.5,
  timestamp: now()
}

// TODO Inherit all of these from mds-test-data
const AUTH = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`

before(done => {
  const testTimestampNow = now() // Hacky fix
  const devices: Device[] = makeDevices(3, now() - 1000)
  const events: VehicleEvent[] = [
    // BEGIN GOOD TRANSITIONS
    {
      provider_id: TEST1_PROVIDER_ID,
      device_id: devices[0].device_id,
      event_type: VEHICLE_EVENTS.provider_pick_up,
      recorded: testTimestampNow - 90,
      timestamp: testTimestampNow - 90,
      telemetry: TEST_TELEMETRY
    },
    {
      provider_id: TEST1_PROVIDER_ID,
      device_id: devices[0].device_id,
      event_type: VEHICLE_EVENTS.trip_enter,
      trip_id: TRIP_UUID,
      recorded: testTimestampNow - 80,
      timestamp: testTimestampNow - 80,
      telemetry: TEST_TELEMETRY
    },
    {
      provider_id: TEST1_PROVIDER_ID,
      device_id: devices[0].device_id,
      event_type: VEHICLE_EVENTS.trip_leave,
      trip_id: TRIP_UUID,
      recorded: testTimestampNow - 70,
      timestamp: testTimestampNow - 70,
      telemetry: TEST_TELEMETRY
    },
    {
      provider_id: TEST1_PROVIDER_ID,
      device_id: devices[0].device_id,
      event_type: VEHICLE_EVENTS.provider_pick_up,
      recorded: testTimestampNow - 60,
      timestamp: testTimestampNow - 60,
      telemetry: TEST_TELEMETRY
    }, // BEGIN BAD TRANSITIONS
    {
      provider_id: TEST1_PROVIDER_ID,
      device_id: devices[0].device_id,
      event_type: VEHICLE_EVENTS.service_start,
      recorded: testTimestampNow - 50,
      timestamp: testTimestampNow - 50,
      telemetry: TEST_TELEMETRY
    },
    {
      provider_id: TEST1_PROVIDER_ID,
      device_id: devices[0].device_id,
      event_type: VEHICLE_EVENTS.trip_leave,
      trip_id: TRIP_UUID,
      recorded: testTimestampNow - 40,
      timestamp: testTimestampNow - 40,
      telemetry: TEST_TELEMETRY
    },
    {
      provider_id: TEST1_PROVIDER_ID,
      device_id: devices[0].device_id,
      event_type: VEHICLE_EVENTS.trip_start,
      trip_id: TRIP_UUID,
      recorded: testTimestampNow - 30,
      timestamp: testTimestampNow - 30,
      telemetry: TEST_TELEMETRY
    },
    {
      provider_id: TEST1_PROVIDER_ID,
      device_id: devices[0].device_id,
      event_type: VEHICLE_EVENTS.provider_pick_up,
      recorded: testTimestampNow - 20,
      timestamp: testTimestampNow - 20,
      telemetry: TEST_TELEMETRY
    }
  ]
  const telemetry: Telemetry[] = []
  const seedData = { devices, events, telemetry }
  Promise.all([db.initialize(), cache.initialize()]).then(() => {
    Promise.all([cache.seed(seedData), db.seed(seedData)]).then(() => {
      done()
    })
  })
})

after(done => {
  request
    .get('/test/shutdown')
    .set('Authorization', AUTH)
    .expect(200)
    .end(err => {
      done(err)
    })
})

describe('Tests API', () => {
  it('gets the root', done => {
    request
      .get('/')
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('gets vehicle counts per provider', done => {
    request
      .get('/admin/vehicle_counts')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        // log('result----->', result.body)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verifies 8 total events, and 4 are non-conformant', done => {
    request
      .get('/admin/last_day_stats_by_provider')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        log('----', JSON.stringify(result.body))
        test.assert(result.body[TEST1_PROVIDER_ID].events_not_in_conformance === 4)
        test.assert(result.body[TEST1_PROVIDER_ID].events_last_24h === 8)
        done(err)
      })
  })

  // TODO make the checks in here more robust. There should be a check to ensure
  // that old recorded items don't show up. This will probably require
  // writing functions that allow you to update the recorded column but
  // I've spent enough time on this right now.
  it('gets recent stats by provider', done => {
    // These outer two promises are here to help check that old telemetry/event data
    // added by the call to .seed later don't show up in the final results
    request
      .get('/admin/last_day_stats_by_provider')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        // log('result----->', result.body)
        test.value(result).hasHeader('content-type', APP_JSON)
        const testObject = test.object(result.body)
        testObject.hasProperty(TEST1_PROVIDER_ID)
        const providerTestObject1 = test.object(result.body[TEST1_PROVIDER_ID])
        providerTestObject1.hasProperty('ms_since_last_event')
        // providerTestObject1.hasProperty('time_since_last_telemetry')
        providerTestObject1.hasProperty('registered_last_24h')
        providerTestObject1.hasProperty('events_last_24h')
        // providerTestObject1.hasProperty('num_telemetry')

        // Fewer fixtures exist for this one right now
        // const providerTestObject2 = test.object(result.body[TEST1_PROVIDER_ID2])
        // providerTestObject1.hasProperty('time_since_last_telemetry')
        // providerTestObject1.hasProperty('events_last_24h')
        // providerTestObject1.hasProperty('num_telemetry')
        done(err)
      })
  })
})
