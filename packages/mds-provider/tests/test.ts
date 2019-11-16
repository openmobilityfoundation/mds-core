/* eslint-disable promise/no-callback-in-promise */
/* eslint-disable promise/always-return */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable @typescript-eslint/no-floating-promises */
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

import supertest from 'supertest'
import { now } from '@mds-core/mds-utils'
import { Device, Telemetry, VehicleEvent, VEHICLE_TYPES, PROPULSION_TYPES, VEHICLE_EVENTS } from '@mds-core/mds-types'
import { makeTelemetryStream, makeTelemetry, makeDevices, SCOPED_AUTH } from '@mds-core/mds-test-data'
import test from 'unit.js'
import { ApiServer } from '@mds-core/mds-api-server'
import cache from '@mds-core/mds-cache'
import db from '@mds-core/mds-db'
import log from '@mds-core/mds-logger'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import { api } from '../api'

const APP_JSON = 'application/json; charset=utf-8'
const EMPTY_SCOPE = SCOPED_AUTH([], '')
const TRIPS_READ_SCOPE = SCOPED_AUTH(['trips:read'])
const STATUS_CHANGES_READ_SCOPE = SCOPED_AUTH(['status_changes:read'])

const request = supertest(ApiServer(api))

const ORIGINAL_TEST_TIMESTAMP = 1546453100001
let test_timestamp = ORIGINAL_TEST_TIMESTAMP

const DEVICE_UUID = 'aa551174-f324-4251-bfed-28d9f3f473aa'
const DEVICE_UUID2 = 'bb551174-f324-4251-bfed-28d9f3f473bb'

const TRIP_UUID = 'aa981864-cc17-40cf-aea3-70fd985e2eaa'
// const TRIP_UUID2 = 'bb981864-cc17-40cf-aea3-70fd985e2eaa'

const DEVICE_VIN = 'test-vin-1'
const DEVICE_VIN2 = 'test-vin-2'

const TEST_DEVICE: Device = {
  device_id: DEVICE_UUID,
  provider_id: MOCHA_PROVIDER_ID,
  vehicle_id: DEVICE_VIN,
  type: VEHICLE_TYPES.bicycle,
  propulsion: [PROPULSION_TYPES.human],
  year: 2018,
  mfgr: 'Schwinn',
  model: 'Mantaray',
  recorded: now()
}

const TEST_DEVICE2: Device = {
  device_id: DEVICE_UUID2,
  provider_id: MOCHA_PROVIDER_ID,
  vehicle_id: DEVICE_VIN2,
  type: VEHICLE_TYPES.scooter,
  propulsion: [PROPULSION_TYPES.electric],
  year: 2017,
  mfgr: 'Xiaomi',
  model: 'Mi',
  recorded: now()
}

const BASE_TELEMETRY: Telemetry = {
  device_id: DEVICE_UUID,
  provider_id: MOCHA_PROVIDER_ID,
  gps: {
    lat: 37.3382,
    lng: -121.8863,
    speed: 0,
    accuracy: 1,
    heading: 180
  },
  charge: 0.5,
  timestamp: ORIGINAL_TEST_TIMESTAMP,
  recorded: now()
}

const BASE_TELEMETRY2: Telemetry = {
  device_id: DEVICE_UUID2,
  provider_id: MOCHA_PROVIDER_ID,
  gps: {
    lat: 36.3382,
    lng: -122.8863,
    speed: 0,
    accuracy: 1,
    heading: 180
  },
  charge: 0.5,
  timestamp: test_timestamp,
  recorded: now()
}

const trip_telemetry = makeTelemetryStream(BASE_TELEMETRY, 10)
const test_telemetry = [BASE_TELEMETRY2, ...trip_telemetry]

const start_telemetry = trip_telemetry[0]
const end_telemetry = trip_telemetry[trip_telemetry.length - 1]

const test_trip_start: VehicleEvent = {
  device_id: DEVICE_UUID,
  provider_id: MOCHA_PROVIDER_ID,
  event_type: 'trip_start',
  timestamp: start_telemetry.timestamp + 60 * 60,
  telemetry: start_telemetry,
  telemetry_timestamp: start_telemetry.timestamp,
  trip_id: TRIP_UUID,
  recorded: now()
}

const test_trip_end: VehicleEvent = {
  device_id: DEVICE_UUID,
  provider_id: MOCHA_PROVIDER_ID,
  event_type: 'trip_end',
  timestamp: end_telemetry.timestamp + 60 * 60,
  telemetry: end_telemetry,
  telemetry_timestamp: end_telemetry.timestamp,
  trip_id: TRIP_UUID,
  recorded: now()
}

test_timestamp += 600

const test_deregister: VehicleEvent = {
  trip_id: null,
  device_id: DEVICE_UUID,
  provider_id: MOCHA_PROVIDER_ID,
  event_type: VEHICLE_EVENTS.deregister,
  timestamp: test_timestamp,
  recorded: now()
}

const test_events = [test_trip_start, test_trip_end, test_deregister]

const test_devices = [TEST_DEVICE, TEST_DEVICE2, ...makeDevices(98, ORIGINAL_TEST_TIMESTAMP)]

test_telemetry.push(...makeTelemetry(test_devices, ORIGINAL_TEST_TIMESTAMP))

const test_data = {
  devices: test_devices,
  events: test_events,
  telemetry: test_telemetry
}

describe('Tests app', () => {
  before('initializes the db and cache', async () => {
    await Promise.all([db.initialize(), cache.initialize()])
    await Promise.all([db.seed(test_data), cache.seed(test_data)])
  })

  after('Shuts down the db and cache', async () => {
    await Promise.all([db.shutdown(), cache.shutdown()])
  })

  it('Get Trips (no authorization)', done => {
    request
      .get('/trips')
      .expect(401)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('Get Trips (no scope)', done => {
    request
      .get('/trips')
      .set('Authorization', EMPTY_SCOPE)
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('Get Trips (all)', done => {
    request
      .get('/trips')
      .set('Authorization', TRIPS_READ_SCOPE)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('data')
        test.object(result.body.data).hasProperty('trips')
        test.value(result.body.data.trips.length).is(1)
        done(err)
      })
  })

  it('Get Trips (non-existent vehicle)', done => {
    request
      .get('/trips?device_id=thisisnotadeviceid')
      .set('Authorization', TRIPS_READ_SCOPE)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.string(result.body.result).contains('invalid device_id')
        done(err)
      })
  })

  it('Get Trips (vehicle)', done => {
    request
      .get(`/trips?device_id=${DEVICE_UUID}`)
      .set('Authorization', TRIPS_READ_SCOPE)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('data')
        test.object(result.body.data).hasProperty('trips')
        done(err)
      })
  })

  it('Get Trips (date range)', done => {
    request
      .get(`/trips?start_time=${test_trip_start.timestamp}&end_time=${test_trip_end.timestamp}`)
      .set('Authorization', TRIPS_READ_SCOPE)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('data')
        test.object(result.body.data).hasProperty('trips')
        done(err)
      })
  })

  it('Get Status Changes (no authorization)', done => {
    request
      .get('/status_changes')
      .expect(401)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('Get Status Changes (no scope)', done => {
    request
      .get('/status_changes')
      .set('Authorization', EMPTY_SCOPE)
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('Get Status Changes (all)', done => {
    request
      .get('/status_changes')
      .set('Authorization', STATUS_CHANGES_READ_SCOPE)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('data')
        test.object(result.body.data).hasProperty('status_changes')
        test.value(result.body.data.status_changes.length).is(3)
        done(err)
      })
  })

  it('Get Status Changes (ORIGINAL_TEST_TIMESTAMP)', done => {
    request
      .get(`/status_changes?start_time=${test_trip_start.timestamp}&end_time=${test_trip_end.timestamp}`)
      .set('Authorization', STATUS_CHANGES_READ_SCOPE)
      .expect(200)
      .end((err, result) => {
        log.info('----- one change:', result.body)
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('data')
        test.object(result.body.data).hasProperty('status_changes')
        test.value(result.body.data.status_changes.length).is(2)
        done(err)
      })
  })

  it('Get Status Changes (invalid device_id)', done => {
    request
      .get(`/status_changes?device_id=notavalidUUID`)
      .set('Authorization', STATUS_CHANGES_READ_SCOPE)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
})
