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
import { PROVIDER_UUID, PROVIDER_AUTH, makeTelemetryStream, makeTelemetry, makeDevices } from '@mds-core/mds-test-data'
import test from 'unit.js'
import { ApiServer } from '@mds-core/mds-api-server'
import log from '@mds-core/mds-logger'
import { api } from '../api'
import { ProviderEventProcessor } from '../event-processor'

process.env.PATH_PREFIX = '/provider'

const APP_JSON = 'application/json; charset=utf-8'

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
  provider_id: PROVIDER_UUID,
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
  provider_id: PROVIDER_UUID,
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
  provider_id: PROVIDER_UUID,
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
  provider_id: PROVIDER_UUID,
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
  provider_id: PROVIDER_UUID,
  event_type: 'trip_start',
  timestamp: start_telemetry.timestamp + 60 * 60,
  telemetry: start_telemetry,
  telemetry_timestamp: start_telemetry.timestamp,
  trip_id: TRIP_UUID,
  recorded: now()
}

const test_trip_end: VehicleEvent = {
  device_id: DEVICE_UUID,
  provider_id: PROVIDER_UUID,
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
  provider_id: PROVIDER_UUID,
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
  it('initializes the db and cache', done => {
    request
      .get('/test/initialize')
      .set('Authorization', PROVIDER_AUTH)
      .expect(201)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verifies that it can create random seed data', done => {
    request
      .get('/test/seed?n=10')
      .set('Authorization', PROVIDER_AUTH)
      .expect(201)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('initializes the db and cache (2nd pass)', done => {
    request
      .get('/test/initialize')
      .set('Authorization', PROVIDER_AUTH)
      .expect(201)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verifies that it can post specific seed data', done => {
    request
      .post('/test/seed')
      .set('Authorization', PROVIDER_AUTH)
      .send(test_data)
      .expect(201)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verifies event processing', done => {
    ProviderEventProcessor({ interval: 0 }).then(
      processed => {
        test.value(processed).is(3)
        done()
      },
      err => done(err)
    )
  })

  it('tries to get trips without authorization', done => {
    request
      .get('/trips')
      .expect(401)
      .end((err, result) => {
        test.value(result.text).is('Unauthorized')
        done(err)
      })
  })

  it('verifies get all trips', done => {
    request
      .get('/trips')
      .set('Authorization', PROVIDER_AUTH)
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

  it('verifies get trips for non-existent vehicle fails', done => {
    request
      .get('/trips?device_id=thisisnotadeviceid')
      .set('Authorization', PROVIDER_AUTH)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.string(result.body.result).contains('invalid device_id')
        done(err)
      })
  })

  it('verifies get trips for vehicle', done => {
    request
      .get(`/trips?device_id=${DEVICE_UUID}`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('data')
        test.object(result.body.data).hasProperty('trips')
        done(err)
      })
  })

  it('verifies get trips for date range', done => {
    request
      .get(`/trips?start_time=${test_trip_start.timestamp}&end_time=${test_trip_end.timestamp}`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('data')
        test.object(result.body.data).hasProperty('trips')
        done(err)
      })
  })

  it('verifies get all status changes', done => {
    request
      .get('/status_changes')
      .set('Authorization', PROVIDER_AUTH)
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

  it('verifies get status changes for ORIGINAL_TEST_TIMESTAMP', done => {
    request
      .get(`/status_changes?start_time=${test_trip_start.timestamp}&end_time=${test_trip_end.timestamp}`)
      .set('Authorization', PROVIDER_AUTH)
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

  it('verifies get status change for invalid device_id', done => {
    request
      .get(`/status_changes?device_id=notavalidUUID`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('shuts down the db', done => {
    request
      .get('/test/shutdown')
      .set('Authorization', PROVIDER_AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
})
