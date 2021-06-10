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

// eslint directives:
/* eslint-disable no-plusplus */
/* eslint-disable no-useless-concat */
/* eslint-disable prefer-destructuring */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/always-return */
/* eslint-disable promise/no-nesting */
/* eslint-disable promise/no-callback-in-promise */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import supertest from 'supertest'
import test from 'unit.js'
import {
  Timestamp,
  Device,
  VehicleEvent,
  TAXI_VEHICLE_EVENTS,
  TAXI_VEHICLE_EVENT,
  MICRO_MOBILITY_VEHICLE_EVENTS,
  TAXI_EVENT_STATES_MAP,
  MICRO_MOBILITY_EVENT_STATES_MAP,
  TripMetadata,
  TRIP_STATE,
  TNC_VEHICLE_EVENT,
  TNC_EVENT_STATES_MAP
} from '@mds-core/mds-types'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-agency-cache'
import stream from '@mds-core/mds-stream'
import { makeDevices, makeEvents, JUMP_TEST_DEVICE_1 } from '@mds-core/mds-test-data'
import { ApiServer } from '@mds-core/mds-api-server'
import { TEST1_PROVIDER_ID, TEST2_PROVIDER_ID } from '@mds-core/mds-providers'
import { pathPrefix, uuid } from '@mds-core/mds-utils'
import { api } from '../api'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(ApiServer(api))

function now(): Timestamp {
  return Date.now()
}

const APP_JSON = 'application/vnd.mds.agency+json; charset=utf-8; version=0.4'

const PROVIDER_SCOPES = 'admin:all'
const DEVICE_UUID = 'ec551174-f324-4251-bfed-28d9f3f473fc'
const TRIP_UUID = '1f981864-cc17-40cf-aea3-70fd985e2ea7'
const TEST_TELEMETRY = {
  device_id: DEVICE_UUID,
  provider_id: TEST1_PROVIDER_ID,
  gps: {
    lat: 37.3382,
    lng: -121.8863,
    speed: 0,
    hdop: 1,
    heading: 180,
    accuracy: null,
    altitude: null,
    charge: null
  },
  charge: 0.5,
  timestamp: now()
}
const TEST_TELEMETRY2 = {
  device_id: DEVICE_UUID,
  gps: {
    lat: 37.3382,
    lng: -121.8863,
    speed: 0,
    hdop: 1,
    heading: 180,
    satellites: 10
  },
  charge: 0.5,
  timestamp: now() + 1000
}

const TEST_BICYCLE: Omit<Device, 'recorded' | 'accessibility_options'> = {
  device_id: DEVICE_UUID,
  provider_id: TEST1_PROVIDER_ID,
  vehicle_id: 'test-id-1',
  vehicle_type: 'bicycle',
  propulsion_types: ['human'],
  year: 2018,
  mfgr: 'Schwinn',
  modality: 'micromobility',
  model: 'Mantaray'
}

const TEST_TAXI: Omit<Device, 'recorded'> = {
  accessibility_options: ['wheelchair_accessible'],
  device_id: uuid(),
  provider_id: TEST1_PROVIDER_ID,
  vehicle_id: 'test-id-1',
  vehicle_type: 'car',
  propulsion_types: ['electric'],
  year: 2018,
  mfgr: 'Schwinn',
  modality: 'taxi',
  model: 'Mantaray'
}

const TEST_TNC: Omit<Device, 'recorded'> = {
  accessibility_options: ['wheelchair_accessible'],
  device_id: uuid(),
  provider_id: TEST1_PROVIDER_ID,
  vehicle_id: 'test-id-1',
  vehicle_type: 'car',
  propulsion_types: ['electric'],
  year: 2018,
  mfgr: 'Schwinn',
  modality: 'tnc',
  model: 'Mantaray'
}

let testTimestamp = now()

const test_event: Omit<VehicleEvent, 'recorded' | 'provider_id'> = {
  device_id: DEVICE_UUID,
  event_types: ['decommissioned'],
  vehicle_state: 'removed',
  trip_state: null,
  timestamp: testTimestamp
}

testTimestamp += 1

const JUMP_TEST_DEVICE_1_ID = JUMP_TEST_DEVICE_1.device_id

function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// TODO Inherit all of these from mds-test-data
const AUTH = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`
const AUTH2 = `basic ${Buffer.from(`${TEST2_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`
const AUTH_NO_SCOPE = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}`).toString('base64')}`

before(async () => {
  await Promise.all([db.reinitialize(), cache.reinitialize()])
})

after(async () => {
  await Promise.all([db.shutdown(), cache.shutdown(), stream.shutdown()])
})

describe('Tests API', () => {
  it('verifies unable to access admin if not scoped', done => {
    request
      .get(pathPrefix('/admin/cache/info'))
      .set('Authorization', AUTH_NO_SCOPE)
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.string(result.body.error.reason).is('no access without scope')
        done(err)
      })
  })

  it('verifies post device failure nothing in body', done => {
    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .expect(400)
      .end((err, result) => {
        test.string(result.body.error).contains('missing')
        test.string(result.body.error_description).contains('missing')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get non-existent device', done => {
    request
      .get(pathPrefix(`/vehicles/${DEVICE_UUID}`))
      .set('Authorization', AUTH)
      .expect(404)
      .end((err, result) => {
        log('err', err, 'body', result.body)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get non-existent device from cache', done => {
    request
      .get(pathPrefix(`/vehicles/${DEVICE_UUID}?cached=true`))
      .set('Authorization', AUTH)
      .expect(404)
      .end((err, result) => {
        log('err', err, 'body', result.body)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies post device bad device id', done => {
    const badVehicle = deepCopy(TEST_BICYCLE)
    badVehicle.device_id = 'bad'
    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .send(badVehicle)
      .expect(400)
      .end((err, result) => {
        // log('err', err, 'body', result.body)
        test.string(result.body.error_description).contains('not a UUID')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  // it('verifies post device missing mfgr', (done) => {
  //     let badVehicle = deepCopy(TEST_VEHICLE)
  //     delete badVehicle.mfgr
  //     request.post(pathPrefix('/vehicles'))
  //         .set('Authorization', AUTH)
  //         .send(badVehicle)
  //         .expect(400).end((err, result) => {
  //             // log('err', err, 'body', result.body)
  //             test.string(result.body.error_description).contains('missing')
  //             test.value(result).hasHeader('content-type', APP_JSON)
  //             done(err)
  //         })
  // })
  it('verifies post device missing propulsion_types', done => {
    const { propulsion_types, ...badVehicle } = deepCopy(TEST_BICYCLE)

    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .send(badVehicle)
      .expect(400)
      .end((err, result) => {
        // log('err', err, 'body', result.body)
        test.string(result.body.error_description).contains('missing')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verifies post device bad propulsion', done => {
    const badVehicle = deepCopy(TEST_BICYCLE)
    // @ts-ignore: Spoofing garbage data
    badVehicle.propulsion_types = ['hamster']
    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .send(badVehicle)
      .expect(400)
      .end((err, result) => {
        // log('err', err, 'body', result.body)
        test.string(result.body.error).contains('bad')
        test.string(result.body.error_description).contains('invalid')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  // it('verifies post device missing year', (done) => {
  //     let badVehicle = deepCopy(TEST_VEHICLE)
  //     delete badVehicle.year
  //     request.post(pathPrefix('/vehicles'))
  //         .set('Authorization', AUTH)
  //         .send(badVehicle)
  //         .expect(400).end((err, result) => {
  //             // log('err', err, 'body', result.body)
  //             test.string(result.body.error_description).contains('missing')
  //             test.value(result).hasHeader('content-type', APP_JSON)
  //             done(err)
  //         })
  // })
  it('verifies post device bad year', done => {
    const badVehicle = deepCopy(TEST_BICYCLE)
    // @ts-ignore: Spoofing garbage data
    badVehicle.year = 'hamster'
    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .send(badVehicle)
      .expect(400)
      .end((err, result) => {
        // log('err', err, 'body', result.body)
        test.string(result.body.error).contains('bad')
        test.string(result.body.error_description).contains('invalid')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies post device out-of-range year', done => {
    const badVehicle = deepCopy(TEST_BICYCLE)
    badVehicle.year = 3000
    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .send(badVehicle)
      .expect(400)
      .end((err, result) => {
        // log('err', err, 'body', result.body)
        test.string(result.body.error).contains('bad')
        test.string(result.body.error_description).contains('invalid')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies post device missing vehicle_type', done => {
    const { vehicle_type, ...badVehicle } = deepCopy(TEST_BICYCLE)

    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .send(badVehicle)
      .expect(400)
      .end((err, result) => {
        // log('err', err, 'body', result.body)
        test.string(result.body.error_description).contains('missing')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies post device bad vehicle_type', done => {
    const badVehicle = deepCopy(TEST_BICYCLE)
    // @ts-ignore: Spoofing garbage data
    badVehicle.vehicle_type = 'hamster'
    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .send(badVehicle)
      .expect(400)
      .end((err, result) => {
        // log('err', err, 'body', result.body)
        test.string(result.body.error).contains('bad')
        test.string(result.body.error_description).contains('invalid')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verifies post device success', done => {
    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .send(TEST_BICYCLE)
      .expect(201)
      .end((err, result) => {
        log('err', err, 'body', result.body)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies read back all devices from db', done => {
    request
      .get(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        // log(result.body)
        test.string(result.body.vehicles[0].vehicle_id).is('test-id-1')
        test.string(result.body.vehicles[0].state).is('removed')
        test.string(result.body.links.first).contains('http')
        test.string(result.body.links.last).contains('http')
        test.value(result.body.links.prev).is(null)
        done(err)
      })
  })
  it('verifies get device readback success (database)', done => {
    request
      .get(pathPrefix(`/vehicles/${DEVICE_UUID}`))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        // log('----------', result.body)
        test.object(result.body).match((obj: Device) => obj.device_id === DEVICE_UUID)
        test.object(result.body).match((obj: Device) => obj.provider_id === TEST1_PROVIDER_ID)
        test.object(result.body).match((obj: Device) => obj.state === 'removed')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get device readback success (cache)', done => {
    request
      .get(pathPrefix(`/vehicles/${DEVICE_UUID}?cached=true`))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        // log('----------', result.body)
        test.object(result.body).match((obj: Device) => obj.device_id === DEVICE_UUID)
        test.object(result.body).match((obj: Device) => obj.provider_id === TEST1_PROVIDER_ID)
        test.object(result.body).match((obj: Device) => obj.state === 'removed')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get device readback failure (provider mismatch database)', done => {
    request
      .get(pathPrefix(`/vehicles/${DEVICE_UUID}`))
      .set('Authorization', AUTH2)
      .expect(404)
      .end((err, result) => {
        log('err', err, 'error', result.body.error)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get device readback failure (provider mismatch cache)', done => {
    request
      .get(pathPrefix(`/vehicles/${DEVICE_UUID}?cached=true`))
      .set('Authorization', AUTH2)
      .expect(404)
      .end((err, result) => {
        log('err', err, 'error', result.body.error)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies post same device fails as expected', done => {
    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .send(TEST_BICYCLE)
      .expect(409)
      .end((err, result) => {
        log('err', err, 'body', result.body)
        test.string(result.body.error_description).contains('already registered')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  const NEW_VEHICLE_ID = 'new-vehicle-id'
  it('verifies put update success', done => {
    request
      .put(pathPrefix(`/vehicles/${TEST_BICYCLE.device_id}`))
      .set('Authorization', AUTH)
      .send({
        vehicle_id: NEW_VEHICLE_ID
      })
      .expect(201)
      .end((err, result) => {
        // log('----> err', err, 'body', result.body)
        // test.string(result.body.error).contains('already_registered')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies put update failure (provider mismatch)', done => {
    request
      .put(pathPrefix(`/vehicles/${TEST_BICYCLE.device_id}`))
      .set('Authorization', AUTH2)
      .send({
        vehicle_id: NEW_VEHICLE_ID
      })
      .expect(404)
      .end((err, result) => {
        log('----> err', err, 'body', result.body.error)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get device readback success after update (database)', done => {
    request
      .get(pathPrefix(`/vehicles/${DEVICE_UUID}`))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.object(result.body).match((obj: Device) => obj.vehicle_id === NEW_VEHICLE_ID)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get device readback success after update (cache)', done => {
    request
      .get(pathPrefix(`/vehicles/${DEVICE_UUID}?cached=true`))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.object(result.body).match((obj: Device) => obj.vehicle_id === NEW_VEHICLE_ID)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies put bogus device_id fail', done => {
    request
      .put(pathPrefix('/vehicles/' + 'hamster'))
      .set('Authorization', AUTH)
      .send({
        vehicle_id: 'new-vehicle-id'
      })
      .expect(400)
      .end((err, result) => {
        // log('----> err', err, 'body', result.body)
        // test.string(result.body.error).contains('already_registered')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies put non-existent device_id fail', done => {
    request
      .put(pathPrefix(`/vehicles/${TRIP_UUID}`))
      .set('Authorization', AUTH)
      .send({
        vehicle_id: 'new-vehicle-id'
      })
      .expect(404)
      .end((err, result) => {
        // log('----> err', err, 'body', result.body)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies read back all device_ids from db', done => {
    request
      .get(pathPrefix('/admin/vehicle_ids'))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.string(result.body.result).contains('success')
        done(err)
      })
  })
  it('verifies read back for non-existent provider fails', done => {
    request
      .get(pathPrefix('/admin/vehicle_ids?provider_id=123potato'))
      .set('Authorization', AUTH)
      .expect(400)
      .end((err, result) => {
        test.string(result.body.error).contains('bad_param')
        test.string(result.body.error_description).contains('invalid provider_id')
        done(err)
      })
  })

  it('resets the cache', async () => {
    await cache.reset()
  })

  it('refreshes the cache', done => {
    request
      .get(pathPrefix('/admin/cache/refresh'))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.string(result.body.result).contains('success')
        done(err)
      })
  })

  it('shuts down the db to verify that it will come back up', async () => {
    await db.shutdown()
  })

  it('verifies on_hours success', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['on_hours'],
        vehicle_state: 'available',
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp + 10000
      })
      .expect(201)
      .end((err, result) => {
        testTimestamp += 20000
        test.string(result.body.state).is('available')
        done(err)
      })
  })

  it('verifies read back all devices from db', done => {
    request
      .get(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.string(result.body.vehicles[0].vehicle_id).is('new-vehicle-id')
        test.string(result.body.vehicles[0].state).is('available')
        test.string(result.body.links.first).contains('http')
        test.string(result.body.links.last).contains('http')
        done(err)
      })
  })

  // status
  it('verifies post device status deregister success', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send(test_event)
      .expect(201)
      .end((err, result) => {
        log('post deregister response:', JSON.stringify(result.body))
        done(err)
      })
  })

  it('verifies read-back of post device status decomissioned success (db)', async () => {
    const event = await db.readEvent(DEVICE_UUID, test_event.timestamp)
    test.assert(event.event_types[0] === 'decommissioned')
    test.assert(event.device_id === DEVICE_UUID)
  })

  it('verifies post device status bogus event', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['BOGUS'],
        vehicle_state: 'foo',
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(400)
      .end((err, result) => {
        test.string(result.body.error_description).contains('invalid')
        done(err)
      })
  })
  it('verifies post device status bogus DEVICE_UUID', done => {
    request
      .post(pathPrefix('/vehicles/' + 'bogus' + '/event'))
      .set('Authorization', AUTH)
      .send({
        event_types: ['maintenance_pick_up'],
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(400)
      .end((err, result) => {
        log(err, result.body)
        test.string(result.body.error_description).contains('invalid')
        done(err)
      })
  })
  it('verifies post device status provider mismatch', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH2)
      .send({
        event_types: ['maintenance_pick_up'],
        vehicle_state: 'removed',
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(400)
      .end((err, result) => {
        log('post event err', result.body)
        test.string(result.body.error_description).contains('The specified device_id has not been registered')
        done(err)
      })
  })
  it('verifies post device status missing timestamp', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['maintenance_pick_up'],
        vehicle_state: 'removed',
        telemetry: TEST_TELEMETRY
      })
      .expect(400)
      .end((err, result) => {
        // log('post event', result.body)
        test.string(result.body.error).contains('missing')
        test.string(result.body.error_description).contains('missing')
        done(err)
      })
  })
  it('verifies post device status bad timestamp', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['provider_drop_off'],
        vehicle_state: 'available',
        telemetry: TEST_TELEMETRY,
        timestamp: 'hamster'
      })
      .expect(400)
      .end((err, result) => {
        // log('post event', result.body)
        test.string(result.body.error).contains('bad')
        test.string(result.body.error_description).contains('invalid')
        done(err)
      })
  })
  it('verifies post device maintenance event', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['maintenance_pick_up'],
        vehicle_state: 'removed',
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        done(err)
      })
  })
  it('verifies post duplicate event fails as expected', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['maintenance_pick_up'],
        vehicle_state: 'removed',
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp - 1
      })
      .expect(400)
      .end((err, result) => {
        // log('post event', result.body)
        test
          .string(result.body.error_description)
          .contains('An event with this device_id and timestamp has already been received')
        done(err)
      })
  })
  it('verifies post event to non-existent vehicle fails as expected', done => {
    request
      .post(pathPrefix(`/vehicles/${TRIP_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['maintenance_pick_up'],
        vehicle_state: 'removed',
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp
      })
      .expect(400)
      .end((err, result) => {
        // log('----> post event meant to fail', result.body)
        test.string(result.body.error_description).contains('The specified device_id has not been registered')
        done(err)
      })
  })

  // start_trip
  it('verifies post start trip success', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_start'],
        vehicle_state: 'on_trip',
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        console.log(result.body)
        done(err)
      })
  })
  it('verifies post start trip without trip-id fails', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_start'],
        vehicle_state: 'on_trip',
        // trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(400)
      .end((err, result) => {
        test.string(result.body.error).contains('missing')
        done(err)
      })
  })
  it('verifies post trip leave success', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_leave_jurisdiction'],
        vehicle_state: 'elsewhere',
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        done(err)
      })
  })
  it('verifies post trip enter success', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_enter_jurisdiction'],
        vehicle_state: 'on_trip',
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        done(err)
      })
  })
  it('verifies post end trip success', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_end'],
        vehicle_state: 'available',
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        done(err)
      })
  })

  it('verifies post trip end readback telemetry', async () => {
    const { device_id, timestamp } = TEST_TELEMETRY
    const [telemetry] = await db.readTelemetry(device_id, timestamp, timestamp)
    test.value(telemetry.device_id).is(TEST_TELEMETRY.device_id)
  })

  it('verifies post reserve success', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['reservation_start'],
        vehicle_state: 'reserved',
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        done(err)
      })
  })
  it('verifies post reserve cancellation success', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['reservation_cancel'],
        vehicle_state: 'available',
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        done(err)
      })
  })

  it('verifies post start trip missing event', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        vehicle_state: 'on_trip',
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(400)
      .end((err, result) => {
        test.string(result.body.error).contains('missing')
        test.string(result.body.error_description).contains('missing')
        done(err)
      })
  })

  const { gps, ...telemetry_without_location } = deepCopy(TEST_TELEMETRY)

  it('verifies post trip start missing location', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_start'],
        vehicle_state: 'on_trip',
        trip_id: TRIP_UUID,
        timestamp: testTimestamp++
      })
      .expect(400)
      .end((err, result) => {
        log(result.body)
        test.string(result.body.error).contains('missing')
        test.string(result.body.error_description).contains('invalid')
        done(err)
      })
  })

  it('verifies post trip end fail bad trip_id', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_end'],
        vehicle_state: 'available',
        trip_id: 'BOGUS',
        timestamp: testTimestamp++,
        telemetry: TEST_TELEMETRY
      })
      .expect(400)
      .end((err, result) => {
        log(result.body)
        test.string(result.body.error).contains('bad')
        test.string(result.body.error_description).contains('invalid')
        done(err)
      })
  })
  const telemetry_with_bad_lat = deepCopy(TEST_TELEMETRY)
  // @ts-ignore: Spoofing garbage data
  telemetry_with_bad_lat.gps.lat = 'hamster'

  it('verifies post trip end fail bad latitude', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_end'],
        vehicle_state: 'available',
        trip_id: TRIP_UUID,
        timestamp: testTimestamp++,
        telemetry: telemetry_with_bad_lat
      })
      .expect(400)
      .end((err, result) => {
        log(result.body)
        test.string(result.body.error).contains('bad')
        test.string(result.body.error_description).contains('invalid')
        done(err)
      })
  })
  const telemetry_with_bad_alt = deepCopy(TEST_TELEMETRY)
  // @ts-ignore: Spoofing garbage data
  telemetry_with_bad_alt.gps.altitude = 'hamster'

  it('verifies post trip end fail bad altitude', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_end'],
        vehicle_state: 'available',
        trip_id: TRIP_UUID,
        timestamp: testTimestamp++,
        telemetry: telemetry_with_bad_alt
      })
      .expect(400)
      .end((err, result) => {
        log(result.body)
        test.string(result.body.error).contains('bad')
        test.string(result.body.error_description).contains('invalid altitude')
        done(err)
      })
  })
  const telemetry_with_bad_accuracy = deepCopy(TEST_TELEMETRY)
  // @ts-ignore: Spoofing garbage data
  telemetry_with_bad_accuracy.gps.accuracy = 'potato'

  it('verifies post trip end fail bad accuracy', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_end'],
        vehicle_state: 'available',
        trip_id: TRIP_UUID,
        timestamp: testTimestamp++,
        telemetry: telemetry_with_bad_accuracy
      })
      .expect(400)
      .end((err, result) => {
        test.string(result.body.error).contains('bad_param')
        test.string(result.body.error_description).contains('invalid accuracy')
        done(err)
      })
  })
  const telemetry_with_bad_speed = deepCopy(TEST_TELEMETRY)
  // @ts-ignore: Spoofing garbage data
  telemetry_with_bad_speed.gps.speed = 'potato'

  it('verifies post trip end fail bad speed', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_end'],
        vehicle_state: 'available',
        trip_id: TRIP_UUID,
        timestamp: testTimestamp++,
        telemetry: telemetry_with_bad_speed
      })
      .expect(400)
      .end((err, result) => {
        test.string(result.body.error).contains('bad_param')
        test.string(result.body.error_description).contains('invalid speed')
        done(err)
      })
  })
  const telemetry_with_bad_satellites = deepCopy(TEST_TELEMETRY)
  // @ts-ignore: Spoofing garbage data
  telemetry_with_bad_satellites.gps.satellites = 'potato'

  it('verifies post trip end fail bad satellites', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_end'],
        vehicle_state: 'available',
        trip_id: TRIP_UUID,
        timestamp: testTimestamp++,
        telemetry: telemetry_with_bad_satellites
      })
      .expect(400)
      .end((err, result) => {
        test.string(result.body.error).contains('bad_param')
        test.string(result.body.error_description).contains('invalid satellites')
        done(err)
      })
  })
  it('verifies post end trip missing location', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['trip_end'],
        vehicle_state: 'available',
        trip_id: TRIP_UUID,
        timestamp: testTimestamp++,
        TEST_TELEMETRY: telemetry_without_location
      })
      .expect(400)
      .end((err, result) => {
        log(result.body)
        test.string(result.body.error).contains('missing')
        test.string(result.body.error_description).contains('missing')
        done(err)
      })
  })

  // post some event in past
  // make sure it's ok to do so
  const lateTimestamp = testTimestamp - 200000 // 2000s before
  log('lateTimestamp', lateTimestamp)
  it('verifies late-event off-hours success', done => {
    request
      .post(pathPrefix(`/vehicles/${DEVICE_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['off_hours'],
        vehicle_state: 'non_operational',
        telemetry: TEST_TELEMETRY,
        timestamp: lateTimestamp
      })
      .expect(201)
      .end((err, result) => {
        done(err)
      })
  })

  // read back posted event (cache should not work; it should only have latest)
  it('verifies late-event read-back of off-hours success (db)', async () => {
    const timestamp = lateTimestamp

    const event = await db.readEvent(DEVICE_UUID, timestamp)
    test.object(event).match((obj: VehicleEvent) => obj.event_types[0] === 'off_hours')
  })

  // make sure we read back the latest event, not the past event
  it('verifies out-of-order event reads back latest (cache)', async () => {
    const event = await db.readEvent(DEVICE_UUID, 0)
    test.assert(event.event_types[0] === 'reservation_cancel')
  })

  const WEIRD_UUID = '034e1c90-9f84-4292-a750-e8f395e4869d'
  // tests this particular uuid
  it('verifies wierd uuid', done => {
    request
      .post(pathPrefix(`/vehicles/${WEIRD_UUID}/event`))
      .set('Authorization', AUTH)
      .send({
        event_types: ['off_hours'],
        vehicle_state: 'non_operational',
        telemetry: TEST_TELEMETRY,
        timestamp: lateTimestamp
      })
      // .expect(201)
      .end((err, result) => {
        log('--------', err, result.body)
        done(err)
      })
  })

  it('verifies post telemetry', done => {
    request
      .post(pathPrefix('/vehicles/telemetry'))
      .set('Authorization', AUTH)
      .send({
        data: [TEST_TELEMETRY, TEST_TELEMETRY2]
      })
      .expect(201)
      .end((err, result) => {
        if (err) {
          log('telemetry err', err)
          log('telemetry res', result)
        } else {
          // log('telemetry result', result)
        }
        done(err)
      })
  })
  it('verifies post telemetry handling of empty data payload', done => {
    request
      .post(pathPrefix('/vehicles/telemetry'))
      .set('Authorization', AUTH)
      .send({})
      .expect(400)
      .end((err, result) => {
        if (err) {
          log('telemetry err', err)
        } else {
          test.string(result.body.error_description).contains('Missing data from post-body')
        }
        done(err)
      })
  })
  it('verifies posting the same telemetry does not break things', done => {
    request
      .post(pathPrefix('/vehicles/telemetry'))
      .set('Authorization', AUTH)
      .send({
        data: [TEST_TELEMETRY, TEST_TELEMETRY2]
      })
      .expect(400)
      .end((err, result) => {
        if (err) {
          log('telemetry err', err)
        } else {
          // log('telemetry result', result)
          test.string(result.body.error_description).contains('None of the provided data was valid')
        }
        done(err)
      })
  })
  it('verifies read-back posted telemetry', async () => {
    const { device_id, timestamp } = TEST_TELEMETRY
    const [telemetry] = await db.readTelemetry(device_id, timestamp, timestamp)
    test.value(telemetry.device_id).is(TEST_TELEMETRY.device_id)
  })
  it('verifies fail read-back telemetry with bad timestamp', async () => {
    const { device_id } = TEST_TELEMETRY
    const [telemetry] = await db.readTelemetry(device_id, 0, 0)
    test.assert(!telemetry)
  })

  it('verifies post telemetry with bad device_id', done => {
    const badTelemetry = deepCopy(TEST_TELEMETRY)
    // @ts-ignore: Spoofing garbage data
    badTelemetry.device_id = 'bogus'
    request
      .post(pathPrefix('/vehicles/telemetry'))
      .set('Authorization', AUTH)
      .send({
        data: [badTelemetry]
      })
      .expect(400)
      .end((err, result) => {
        if (err) {
          log('telemetry err', err)
        } else {
          log('telemetry result', result.body)
        }
        done(err)
      })
  })
  it('verifies post telemetry with bad gps.lat', done => {
    const badTelemetry = deepCopy(TEST_TELEMETRY)
    // @ts-ignore: Spoofing garbage data
    badTelemetry.gps.lat = 'bogus'

    request
      .post(pathPrefix('/vehicles/telemetry'))
      .set('Authorization', AUTH)
      .send({
        data: [badTelemetry]
      })
      .expect(400)
      .end((err, result) => {
        if (err) {
          log('post bad telemetry err', err)
        } else {
          log('post bad telemetry result', result.body)
          test.value(result.body.error_details.length).is(1)
        }
        done(err)
      })
  })
  it('verifies post telemetry with bad gps.lng', done => {
    const badTelemetry = deepCopy(TEST_TELEMETRY)
    // @ts-ignore: Spoofing garbage data
    badTelemetry.gps.lng = 'bogus'

    request
      .post(pathPrefix('/vehicles/telemetry'))
      .set('Authorization', AUTH)
      .send({
        data: [badTelemetry]
      })
      .expect(400)
      .end((err, result) => {
        if (err) {
          log('telemetry err', err)
        } else {
          log('telemetry result', result.body)
          test.value(result.body.error_details.length).is(1)
        }
        done(err)
      })
  })
  it('verifies post telemetry with bad charge', done => {
    const badTelemetry = deepCopy(TEST_TELEMETRY)
    // @ts-ignore: Spoofing garbage data
    badTelemetry.charge = 'bogus'

    request
      .post(pathPrefix('/vehicles/telemetry'))
      .set('Authorization', AUTH)
      .send({
        data: [badTelemetry]
      })
      .expect(400)
      .end((err, result) => {
        if (err) {
          log('telemetry err', err)
        } else {
          log('telemetry result', result.body)
          test.value(result.body.error_details.length).is(1)
        }
        done(err)
      })
  })
  it('verifies post telemetry with bad gps.lng', done => {
    const badTelemetry = deepCopy(TEST_TELEMETRY)
    // @ts-ignore: Spoofing garbage data
    badTelemetry.timestamp = 'bogus'

    request
      .post(pathPrefix('/vehicles/telemetry'))
      .set('Authorization', AUTH)
      .send({
        data: [badTelemetry]
      })
      .expect(400)
      .end((err, result) => {
        if (err) {
          log('telemetry err', err)
        } else {
          log('telemetry result', result.body)
          test.value(result.body.error_details.length).is(1)
        }
        done(err)
      })
  })
  it('verifies post telemetry with mismatched provider', done => {
    request
      .post(pathPrefix('/vehicles/telemetry'))
      .set('Authorization', AUTH2)
      .send({
        data: [TEST_TELEMETRY]
      })
      .expect(400)
      .end((err, result) => {
        if (err) {
          log('telemetry err with mismatched provider', err)
        } else {
          log('telemetry result with mismatched provider', result.body)
          test.value(result.body.error_details.length).is(1)
        }
        done(err)
      })
  })
  it('verifies post telemetry with unregistered device', done => {
    const telemetry = { ...TEST_TELEMETRY, device_id: uuid() } // randomly generate a new uuid, obviously not registered

    request
      .post(pathPrefix('/vehicles/telemetry'))
      .set('Authorization', AUTH)
      .send({
        data: [telemetry]
      })
      .expect(400)
      .end((err, result) => {
        if (err) {
          log('telemetry err with mismatched provider', err)
        } else {
          log('telemetry result with mismatched provider', result.body)
          test.value(result.body.error_details.length).is(1)
        }
        done(err)
      })
  })
  it('verifies get device readback w/telemetry success (database)', done => {
    request
      .get(pathPrefix(`/vehicles/${DEVICE_UUID}`))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        log('----------', result.body)
        const deviceA = result.body
        test.value(deviceA.device_id).is(DEVICE_UUID)
        test.value(deviceA.provider_id).is(TEST1_PROVIDER_ID)
        test.value(deviceA.gps.lat).is(TEST_TELEMETRY.gps.lat)
        test.value(deviceA.state).is('available')
        test.value(JSON.stringify(deviceA.prev_events)).is(JSON.stringify(['reservation_cancel']))
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verifies get device readback w/telemetry success (cache)', done => {
    request
      .get(pathPrefix(`/vehicles/${DEVICE_UUID}?cached=true`))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        log('----------readback telemetry success', result.body)
        const deviceB = result.body
        test.value(deviceB.device_id).is(DEVICE_UUID)
        test.value(deviceB.provider_id).is(TEST1_PROVIDER_ID)
        test.value(deviceB.gps.lat).is(TEST_TELEMETRY.gps.lat)
        test.value(deviceB.state).is('available')
        test.value(JSON.stringify(deviceB.prev_events)).is(JSON.stringify(['reservation_cancel']))
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verifies get device defaults to `deregister` if cache misses reads for associated events', async () => {
    await request.post(pathPrefix('/vehicles')).set('Authorization', AUTH).send(JUMP_TEST_DEVICE_1).expect(201)

    await request
      .post(pathPrefix(`/vehicles/${JUMP_TEST_DEVICE_1_ID}/event`))
      .set('Authorization', AUTH)
      .send({
        device_id: JUMP_TEST_DEVICE_1,
        timestamp: now(),
        event_types: ['decommissioned'],
        vehicle_state: 'removed'
      })
      .expect(201)

    const result = await request
      .get(pathPrefix(`/vehicles/${JUMP_TEST_DEVICE_1_ID}`))
      .set('Authorization', AUTH)
      .expect(200)
    test.assert(result.body.state === 'removed')
    test.assert(JSON.stringify(result.body.prev_events) === JSON.stringify(['decommissioned']))
  })

  it('verifies can make request for foreign provider_id', async () => {
    const provider_id = uuid()
    const AUTH = `basic ${Buffer.from(`${provider_id}|${PROVIDER_SCOPES}`).toString('base64')}`

    const [device] = makeDevices(1, now(), provider_id)

    await request.post(pathPrefix('/vehicles')).set('Authorization', AUTH).send(device).expect(201)
  })

  it('get multiple devices endpoint has vehicle status default to `inactive` if event is missing for a device', async () => {
    const result = await request.get(pathPrefix(`/vehicles/`)).set('Authorization', AUTH).expect(200)
    const ids = result.body.vehicles.map((device: any) => device.device_id)
    test.assert(ids.includes(JUMP_TEST_DEVICE_1_ID))
    result.body.vehicles.map((device: any) => {
      if (device.device_id === JUMP_TEST_DEVICE_1_ID) {
        test.assert(device.state === 'removed')
      }
    })
  })

  it('gets cache info', done => {
    request
      .get(pathPrefix('/admin/cache/info'))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('refreshes the cache', done => {
    request
      .get(pathPrefix('/admin/cache/refresh'))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('wipes a vehicle via admin', done => {
    request
      .get(pathPrefix(`/admin/wipe/${TEST_BICYCLE.device_id}`))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('wipes a vehicle via admin that has already been wiped', done => {
    request
      .get(pathPrefix(`/admin/wipe/${TEST_BICYCLE.device_id}`))
      .set('Authorization', AUTH)
      .expect(404)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('fails to wipe a vehicle via admin', done => {
    request
      .get(pathPrefix('/admin/wipe/' + 'bogus'))
      .set('Authorization', AUTH)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
})

describe('Tests pagination', async () => {
  before(async () => {
    const devices = makeDevices(100, now())
    const events = makeEvents(devices, now())
    const seedData = { devices, events, telemetry: [] }
    await Promise.all([db.reinitialize(), cache.reinitialize()])
    await Promise.all([cache.seed(seedData), db.seed(seedData)])
  })

  it('verifies paging links when read back all devices from db', done => {
    request
      .get(pathPrefix('/vehicles?skip=2&take=5&foo=bar'))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.assert(result.body.vehicles.length === 5)
        test.string(result.body.links.first).contains('http')
        test.string(result.body.links.last).contains('http')
        test.string(result.body.links.next).contains('http', 'skip=7')
        test.string(result.body.links.next).contains('http', 'take=5')
        test.string(result.body.links.next).contains('http', 'foo=bar')
        done(err)
      })
  })

  it('verifies reading past the end of the vehicles', done => {
    request
      .get(pathPrefix('/vehicles?skip=20000&take=5'))
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.string(result.body.links.first).contains('http')
        test.string(result.body.links.last).contains('http')
        test.value(result.body.links.next).is(null)
        done(err)
      })
  })

  it('verifies vehicles access for all providers with vehicles:read scope', done => {
    const VEHICLES_READ_AUTH = `basic ${Buffer.from(`${TEST2_PROVIDER_ID}|vehicles:read`).toString('base64')}`
    request
      .get(pathPrefix(`/vehicles?provider_id=${TEST1_PROVIDER_ID}`))
      .set('Authorization', VEHICLES_READ_AUTH)
      .expect(200)
      .end((err, result) => {
        test.assert(result.body.total === 100)
        test.string(result.body.links.first).contains('http')
        test.string(result.body.links.last).contains('http')
        done(err)
      })
  })

  it('verifies no vehicles access for all providers without vehicles:read scope', done => {
    const VEHICLES_READ_AUTH = `basic ${Buffer.from(`${TEST2_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`
    request
      .get(pathPrefix(`/vehicles?provider_id=${TEST1_PROVIDER_ID}`))
      .set('Authorization', VEHICLES_READ_AUTH)
      .expect(200)
      .end((err, result) => {
        test.assert(result.body.total === 0)
        test.string(result.body.links.first).contains('http')
        test.string(result.body.links.last).contains('http')
        done(err)
      })
  })
})

describe('Tests for taxi modality', async () => {
  before(async () => {
    await Promise.all([db.reinitialize()])
  })

  it('verifies post taxi success', done => {
    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .send(TEST_TAXI)
      .expect(201)
      .end((err, result) => {
        done(err)
      })
  })

  for (const taxiEvent of TAXI_VEHICLE_EVENTS) {
    const validStates = TAXI_EVENT_STATES_MAP[taxiEvent]
    for (const vehicle_state of validStates) {
      it(`verifies ${taxiEvent} success`, done => {
        const { device_id } = TEST_TAXI
        const body = {
          event_types: [taxiEvent],
          vehicle_state,
          telemetry: TEST_TELEMETRY,
          timestamp: now(),
          ...(taxiEvent.startsWith('trip_')
            ? { trip_id: '1f943d59-ccc9-4d91-b6e2-0c5e771cbc6b', trip_state: vehicle_state as TRIP_STATE }
            : {})
        }
        request
          .post(pathPrefix(`/vehicles/${device_id}/event`))
          .set('Authorization', AUTH)
          .send(body)
          .expect(201)
          .end((err, result) => {
            // test.string(result.body.status).is(EVENT_STATUS_MAP[taxiEvent])
            done(err)
          })
      })
    }
  }

  /* We want to test for all micromobility events which
   * are not included in the valid Taxi events.
   */
  const MICRO_MOBILITY_EVENTS_NOT_IN_TAXI_EVENTS = MICRO_MOBILITY_VEHICLE_EVENTS.filter(
    item => !TAXI_VEHICLE_EVENTS.includes(item as TAXI_VEHICLE_EVENT)
  )

  for (const microEvent of MICRO_MOBILITY_EVENTS_NOT_IN_TAXI_EVENTS) {
    const validStates = MICRO_MOBILITY_EVENT_STATES_MAP[microEvent]
    for (const vehicle_state of validStates) {
      it('verifies cannot send micromobility type event for a taxi', done => {
        const { device_id } = TEST_TAXI
        request
          .post(pathPrefix(`/vehicles/${device_id}/event`))
          .set('Authorization', AUTH)
          .send({
            event_types: [microEvent],
            vehicle_state,
            telemetry: TEST_TELEMETRY,
            timestamp: now()
          })
          .expect(400)
          .end((err, result) => {
            test.string(result.body.error).contains('bad_param')
            test.string(result.body.error_description).contains('invalid event_type')
            done(err)
          })
      })
    }
  }
})

describe('Tests for tnc modality', async () => {
  before(async () => {
    await Promise.all([db.reinitialize()])
  })

  it('verifies post tnc success', done => {
    request
      .post(pathPrefix('/vehicles'))
      .set('Authorization', AUTH)
      .send(TEST_TNC)
      .expect(201)
      .end((err, result) => {
        done(err)
      })
  })

  for (const tncEvent of TNC_VEHICLE_EVENT) {
    const validStates = TNC_EVENT_STATES_MAP[tncEvent]
    for (const vehicle_state of validStates) {
      it(`verifies ${tncEvent} success`, done => {
        const { device_id } = TEST_TNC
        const body = {
          event_types: [tncEvent],
          vehicle_state,
          telemetry: TEST_TELEMETRY,
          timestamp: now(),
          ...(tncEvent.startsWith('trip_')
            ? { trip_id: '1f943d59-ccc9-4d91-b6e2-0c5e771cbc6b', trip_state: vehicle_state as TRIP_STATE }
            : {})
        }
        request
          .post(pathPrefix(`/vehicles/${device_id}/event`))
          .set('Authorization', AUTH)
          .send(body)
          .expect(201)
          .end((err, result) => {
            // test.string(result.body.status).is(EVENT_STATUS_MAP[taxiEvent])
            done(err)
          })
      })
    }
  }

  /* We want to test for all micromobility events which
   * are not included in the valid tnc events.
   */
  const MICRO_MOBILITY_EVENTS_NOT_IN_TNC_EVENTS = MICRO_MOBILITY_VEHICLE_EVENTS.filter(
    item => !TNC_VEHICLE_EVENT.includes(item as TNC_VEHICLE_EVENT)
  )

  for (const microEvent of MICRO_MOBILITY_EVENTS_NOT_IN_TNC_EVENTS) {
    const validStates = MICRO_MOBILITY_EVENT_STATES_MAP[microEvent]
    for (const vehicle_state of validStates) {
      it('verifies cannot send micromobility type event for a tnc', done => {
        const { device_id } = TEST_TNC
        request
          .post(pathPrefix(`/vehicles/${device_id}/event`))
          .set('Authorization', AUTH)
          .send({
            event_types: [microEvent],
            vehicle_state,
            telemetry: TEST_TELEMETRY,
            timestamp: now()
          })
          .expect(400)
          .end((err, result) => {
            test.string(result.body.error).contains('bad_param')
            test.string(result.body.error_description).contains('invalid event_type')
            done(err)
          })
      })
    }
  }
})

describe('Tests TripMetadata', async () => {
  const metadata: () => Required<Omit<TripMetadata, 'provider_id'>> = () => ({
    trip_id: uuid(),
    requested_trip_start_location: { lat: 34.0522, lng: -118.2437 },
    reservation_time: now(),
    quoted_trip_start_time: now(),
    dispatch_time: now(),
    trip_start_time: now(),
    trip_end_time: now(),
    cancellation_reason: 'test',
    distance: 100,
    accessibility_options: [],
    fare: {
      quoted_cost: 2000,
      actual_cost: 2500,
      components: {},
      currency: 'USD',
      payment_methods: ['cash', 'card', 'equity_program']
    },
    reservation_type: 'on_demand',
    reservation_method: 'app'
  })

  it('Tests valid POST payload returns success code', async () => {
    await request.post(pathPrefix('/trips')).set('Authorization', AUTH).send(metadata()).expect(201)
  })

  it('Tests valid PATCH payload returns success code', async () => {
    await request.patch(pathPrefix('/trips')).set('Authorization', AUTH).send(metadata()).expect(201)
  })

  it('Tests unknown properties are allowed', async () => {
    await request
      .patch(pathPrefix('/trips'))
      .set('Authorization', AUTH)
      .send({ ...metadata(), potato: 'I am good in a stew' })
      .expect(201)
  })

  /**
   * Note: Right now trip_id is the only required property, but this may change down the road. Keeping this test harness around even though it's excessive at the moment, because it could prove very useful 🛠
   */
  for (const key of ['trip_id'] as (keyof Omit<TripMetadata, 'provider_id'>)[]) {
    it(`Tests invalid TripMetadata payload without ${key}`, async () => {
      const { [key]: foo, ...subsetMetadata } = metadata()

      // eslint-disable-next-line no-await-in-loop
      const result = await request
        .post(pathPrefix('/trips'))
        .set('Authorization', AUTH)
        .send(subsetMetadata)
        .expect(400)

      test.string(result.body.error.reason).is('invalid_value')
      test.string(result.body.error.info.details).contains(`value.${key} is required`)
    })
  }
})
