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
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/always-return */
/* eslint-disable promise/no-nesting */
/* eslint-disable promise/no-callback-in-promise */
/* eslint-disable @typescript-eslint/ban-ts-ignore */

import supertest from 'supertest'
import test from 'unit.js'
import {
  VEHICLE_EVENTS,
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  PROPULSION_TYPES,
  Timestamp,
  Device,
  VehicleEvent
} from '@mds-core/mds-types'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import stream from '@mds-core/mds-stream'
import { makeDevices, makeEvents } from '@mds-core/mds-test-data'
import { ApiServer } from '@mds-core/mds-api-server'
import { TEST1_PROVIDER_ID, TEST2_PROVIDER_ID } from '@mds-core/mds-providers'
import { api } from '../api'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(ApiServer(api))

function now(): Timestamp {
  return Date.now()
}

const APP_JSON = 'application/json; charset=utf-8'

const LA_CITY_BOUNDARY = '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'
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
    heading: 180
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

const TEST_VEHICLE = {
  device_id: DEVICE_UUID,
  provider_id: TEST1_PROVIDER_ID,
  vehicle_id: 'test-id-1',
  type: VEHICLE_TYPES.bicycle,
  propulsion: [PROPULSION_TYPES.human],
  year: 2018,
  mfgr: 'Schwinn',
  model: 'Mantaray'
}

let testTimestamp = now()

const test_event = {
  device_id: DEVICE_UUID,
  event_type: VEHICLE_EVENTS.deregister,
  timestamp: testTimestamp
}

testTimestamp += 1

function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// TODO Inherit all of these from mds-test-data
const AUTH = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`
const AUTH2 = `basic ${Buffer.from(`${TEST2_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`
const AUTH_GARBAGE_PROVIDER = `basic ${Buffer.from(`tinylittleinvalidteapot|${PROVIDER_SCOPES}`).toString('base64')}`
const AUTH_UNKNOWN_UUID_PROVIDER = `basic ${Buffer.from(
  `c8f984c5-62a5-4453-b1f7-3b7704a95cfe|${PROVIDER_SCOPES}`
).toString('base64')}`
const AUTH_NO_SCOPE = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}`).toString('base64')}`

before(async () => {
  await Promise.all([db.initialize(), cache.initialize(), stream.initialize()])
})

after(async () => {
  await Promise.all([db.shutdown(), cache.shutdown(), stream.shutdown()])
})

describe('Tests API', () => {
  it('verifies non-uuid provider_id is rejected', done => {
    request
      .get('/devices')
      .set('Authorization', AUTH_GARBAGE_PROVIDER)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.string(result.body.result).contains('invalid provider_id', 'is not a UUID')
        done(err)
      })
  })

  it('verifies unknown provider_id is rejected', done => {
    request
      .get('/devices')
      .set('Authorization', AUTH_UNKNOWN_UUID_PROVIDER)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.string(result.body.result).contains('invalid provider_id', 'is not a known provider')
        done(err)
      })
  })

  it('verifies unable to access admin if not scoped', done => {
    request
      .get('/admin/')
      .set('Authorization', AUTH_NO_SCOPE)
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.string(result.body.result).contains('no admin access without admin:all scope')
        done(err)
      })
  })

  it('verifies post device failure nothing in body', done => {
    request
      .post('/vehicles')
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
      .get(`/vehicles/${DEVICE_UUID}`)
      .set('Authorization', AUTH)
      .expect(404)
      .end((err, result) => {
        log('err', err, 'body', result.body)
        test.string(result.body.error).contains('not_found')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get non-existent device from cache', done => {
    request
      .get(`/vehicles/${DEVICE_UUID}?cached=true`)
      .set('Authorization', AUTH)
      .expect(404)
      .end((err, result) => {
        log('err', err, 'body', result.body)
        test.string(result.body.error).contains('not_found')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies post device bad device id', done => {
    const badVehicle = deepCopy(TEST_VEHICLE)
    badVehicle.device_id = 'bad'
    request
      .post('/vehicles')
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
  //     request.post('/vehicles')
  //         .set('Authorization', AUTH)
  //         .send(badVehicle)
  //         .expect(400).end((err, result) => {
  //             // log('err', err, 'body', result.body)
  //             test.string(result.body.error_description).contains('missing')
  //             test.value(result).hasHeader('content-type', APP_JSON)
  //             done(err)
  //         })
  // })
  it('verifies post device missing propulsion', done => {
    const badVehicle = deepCopy(TEST_VEHICLE)
    delete badVehicle.propulsion
    request
      .post('/vehicles')
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
    const badVehicle = deepCopy(TEST_VEHICLE)
    // @ts-ignore: Spoofing garbage data
    badVehicle.propulsion = ['hamster']
    request
      .post('/vehicles')
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
  //     request.post('/vehicles')
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
    const badVehicle = deepCopy(TEST_VEHICLE)
    // @ts-ignore: Spoofing garbage data
    badVehicle.year = 'hamster'
    request
      .post('/vehicles')
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
    const badVehicle = deepCopy(TEST_VEHICLE)
    badVehicle.year = 3000
    request
      .post('/vehicles')
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
  it('verifies post device missing type', done => {
    const badVehicle = deepCopy(TEST_VEHICLE)
    delete badVehicle.type
    request
      .post('/vehicles')
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
  it('verifies post device bad type', done => {
    const badVehicle = deepCopy(TEST_VEHICLE)
    // @ts-ignore: Spoofing garbage data
    badVehicle.type = 'hamster'
    request
      .post('/vehicles')
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
      .post('/vehicles')
      .set('Authorization', AUTH)
      .send(TEST_VEHICLE)
      .expect(201)
      .end((err, result) => {
        log('err', err, 'body', result.body)
        test.string(result.body.result).contains('success')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies read back all devices from db', done => {
    request
      .get('/vehicles')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        // log(result.body)
        test.string(result.body.vehicles[0].vehicle_id).is('test-id-1')
        test.string(result.body.vehicles[0].status).is('removed')
        test.string(result.body.links.first).contains('http')
        test.string(result.body.links.last).contains('http')
        test.value(result.body.links.prev).is(null)
        done(err)
      })
  })
  it('verifies get device readback success (database)', done => {
    request
      .get(`/vehicles/${DEVICE_UUID}`)
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        // log('----------', result.body)
        test.object(result.body).match((obj: Device) => obj.device_id === DEVICE_UUID)
        test.object(result.body).match((obj: Device) => obj.provider_id === TEST1_PROVIDER_ID)
        test.object(result.body).match((obj: Device) => obj.status === VEHICLE_STATUSES.removed)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get device readback success (cache)', done => {
    request
      .get(`/vehicles/${DEVICE_UUID}?cached=true`)
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        // log('----------', result.body)
        test.object(result.body).match((obj: Device) => obj.device_id === DEVICE_UUID)
        test.object(result.body).match((obj: Device) => obj.provider_id === TEST1_PROVIDER_ID)
        test.object(result.body).match((obj: Device) => obj.status === VEHICLE_STATUSES.removed)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get device readback failure (provider mismatch database)', done => {
    request
      .get(`/vehicles/${DEVICE_UUID}`)
      .set('Authorization', AUTH2)
      .expect(404)
      .end((err, result) => {
        log('err', err, 'error', result.body.error)
        test.string(result.body.error).contains('not_found')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get device readback failure (provider mismatch cache)', done => {
    request
      .get(`/vehicles/${DEVICE_UUID}?cached=true`)
      .set('Authorization', AUTH2)
      .expect(404)
      .end((err, result) => {
        log('err', err, 'error', result.body.error)
        test.string(result.body.error).contains('not_found')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies post same device fails as expected', done => {
    request
      .post('/vehicles')
      .set('Authorization', AUTH)
      .send(TEST_VEHICLE)
      .expect(409)
      .end((err, result) => {
        log('err', err, 'body', result.body)
        test.string(result.body.error).contains('already_registered')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  const NEW_VEHICLE_ID = 'new-vehicle-id'
  it('verifies put update success', done => {
    request
      .put(`/vehicles/${TEST_VEHICLE.device_id}`)
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
      .put(`/vehicles/${TEST_VEHICLE.device_id}`)
      .set('Authorization', AUTH2)
      .send({
        vehicle_id: NEW_VEHICLE_ID
      })
      .expect(404)
      .end((err, result) => {
        log('----> err', err, 'body', result.body.error)
        test.string(result.body.error).contains('not_found')
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('verifies get device readback success after update (database)', done => {
    request
      .get(`/vehicles/${DEVICE_UUID}`)
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
      .get(`/vehicles/${DEVICE_UUID}?cached=true`)
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
      .put('/vehicles/' + 'hamster')
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
      .put(`/vehicles/${TRIP_UUID}`)
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
      .get('/admin/vehicle_ids')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.string(result.body.result).contains('success')
        done(err)
      })
  })
  it('verifies read back for non-existent provider fails', done => {
    request
      .get('/admin/vehicle_ids?provider_id=123potato')
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
      .get('/admin/cache/refresh')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('shuts down the db to verify that it will come back up', async () => {
    await db.shutdown()
  })

  it('verifies service_start success', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'service_start',
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp + 10000
      })
      .expect(201)
      .end((err, result) => {
        testTimestamp += 20000
        test.string(result.body.result).contains('success')
        test.string(result.body.status).is('available')
        done(err)
      })
  })

  it('verifies read back all devices from db', done => {
    request
      .get('/vehicles')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        log(result.body)
        test.string(result.body.vehicles[0].vehicle_id).is('new-vehicle-id')
        test.string(result.body.vehicles[0].status).is('available')
        test.string(result.body.links.first).contains('http')
        test.string(result.body.links.last).contains('http')
        done(err)
      })
  })

  it('verifies service_end success', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: VEHICLE_EVENTS.service_end,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp
      })
      .expect(201)
      .end((err, result) => {
        test.string(result.body.result).contains('success')
        test.string(result.body.status).is('unavailable')
        done(err)
      })
  })

  // status
  it('verifies post device status deregister success', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send(test_event)
      .expect(201)
      .end((err, result) => {
        log('post deregister response:', JSON.stringify(result.body))
        test.string(result.body.result).contains('success')
        done(err)
      })
  })
  it('verifies read-back of post device status deregister success (db)', async () => {
    const event = await db.readEvent(DEVICE_UUID, test_event.timestamp)
    test.assert(event.event_type === VEHICLE_EVENTS.deregister)
    test.assert(event.device_id === DEVICE_UUID)
  })

  it('verifies post device status bogus event', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'BOGUS',
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
      .post('/vehicles/' + 'bogus' + '/event')
      .set('Authorization', AUTH)
      .send({
        event_type: VEHICLE_EVENTS.provider_pick_up,
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH2)
      .send({
        event_type: VEHICLE_EVENTS.provider_pick_up,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(400)
      .end((err, result) => {
        log('post event err', result.body)
        test.string(result.body.error).contains('unregistered')
        done(err)
      })
  })
  it('verifies post device status missing timestamp', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: VEHICLE_EVENTS.provider_pick_up,
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'provider_drop_off',
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: VEHICLE_EVENTS.provider_pick_up,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        // log('post event', result.body)
        test.string(result.body.result).contains('success')
        done(err)
      })
  })
  it('verifies post duplicate event fails as expected', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: VEHICLE_EVENTS.provider_pick_up,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp - 1
      })
      .expect(409)
      .end((err, result) => {
        // log('post event', result.body)
        test.string(result.body.error).contains('duplicate')
        done(err)
      })
  })
  it('verifies post event to non-existent vehicle fails as expected', done => {
    request
      .post(`/vehicles/${TRIP_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: VEHICLE_EVENTS.provider_pick_up,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp
      })
      .expect(400)
      .end((err, result) => {
        // log('----> post event meant to fail', result.body)
        test.string(result.body.error).contains('unregistered')
        done(err)
      })
  })
  it('verifies post event with bad event_type_reason fails', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: VEHICLE_EVENTS.provider_pick_up,
        event_type_reason: 'not_an_event_type',
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp
      })
      .expect(400)
      .end((err, result) => {
        test.string(result.body.error).contains('bad_param')
        test.string(result.body.error_description).contains('invalid event_type_reason')
        done(err)
      })
  })

  // start_trip
  it('verifies post start trip success', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_start',
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        test.string(result.body.result).contains('success')
        done(err)
      })
  })
  it('verifies post start trip without trip-id fails', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_start',
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_leave',
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        test.string(result.body.result).contains('success')
        done(err)
      })
  })
  it('verifies post trip enter success', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_enter',
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        test.string(result.body.result).contains('success')
        done(err)
      })
  })
  it('verifies post end trip success', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_end',
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        test.string(result.body.result).contains('success')
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: VEHICLE_EVENTS.reserve,
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        test.string(result.body.result).contains('success')
        done(err)
      })
  })
  it('verifies post reserve cancellation success', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: VEHICLE_EVENTS.cancel_reservation,
        trip_id: TRIP_UUID,
        telemetry: TEST_TELEMETRY,
        timestamp: testTimestamp++
      })
      .expect(201)
      .end((err, result) => {
        test.string(result.body.result).contains('success')
        done(err)
      })
  })

  const telemetry_without_device_id = deepCopy(TEST_TELEMETRY)
  delete telemetry_without_device_id.device_id

  it('verifies post start trip missing event', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        // event_type: 'trip_start',
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

  const telemetry_without_location = deepCopy(TEST_TELEMETRY)
  delete telemetry_without_location.gps.lat
  delete telemetry_without_location.gps.lng

  it('verifies post trip start missing location', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_start',
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_end',
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_end',
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_end',
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_end',
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_end',
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_end',
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
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: 'trip_end',
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
  it('verifies late-event service-end (rebalance) success', done => {
    request
      .post(`/vehicles/${DEVICE_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: VEHICLE_EVENTS.service_end,
        event_type_reason: 'rebalance',
        telemetry: TEST_TELEMETRY,
        timestamp: lateTimestamp
      })
      .expect(201)
      .end((err, result) => {
        test.string(result.body.result).contains('success')
        done(err)
      })
  })

  // read back posted event (cache should not work; it should only have latest)
  it('verifies late-event read-back of service_end (rebalance) success (db)', async () => {
    const timestamp = lateTimestamp

    const event = await db.readEvent(DEVICE_UUID, timestamp)
    test.object(event).match((obj: VehicleEvent) => obj.event_type_reason === 'rebalance')
  })

  // make sure we read back the latest event, not the past event
  it('verifies out-of-order event reads back latest (cache)', async () => {
    const event = await db.readEvent(DEVICE_UUID, 0)
    test.assert(event.event_type === 'cancel_reservation')
  })

  const WEIRD_UUID = '034e1c90-9f84-4292-a750-e8f395e4869d'
  // tests this particular uuid
  it('verifies wierd uuid', done => {
    request
      .post(`/vehicles/${WEIRD_UUID}/event`)
      .set('Authorization', AUTH)
      .send({
        event_type: VEHICLE_EVENTS.service_end,
        event_type_reason: 'rebalance',
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
      .post('/vehicles/telemetry')
      .set('Authorization', AUTH)
      .send({
        data: [TEST_TELEMETRY, TEST_TELEMETRY2]
      })
      .expect(201)
      .end((err, result) => {
        if (err) {
          log('telemetry err', err)
        } else {
          // log('telemetry result', result)
          test.string(result.body.result).contains('success')
        }
        done(err)
      })
  })
  it('verifies posting the same telemetry does not break things', done => {
    request
      .post('/vehicles/telemetry')
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
          test.string(result.body.result).contains('no new valid')
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
      .post('/vehicles/telemetry')
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
          test.value(result.body.failures.length).is(1)
        }
        done(err)
      })
  })
  it('verifies post telemetry with bad gps.lat', done => {
    const badTelemetry = deepCopy(TEST_TELEMETRY)
    // @ts-ignore: Spoofing garbage data
    badTelemetry.gps.lat = 'bogus'

    request
      .post('/vehicles/telemetry')
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
          test.value(result.body.failures.length).is(1)
        }
        done(err)
      })
  })
  it('verifies post telemetry with bad gps.lng', done => {
    const badTelemetry = deepCopy(TEST_TELEMETRY)
    // @ts-ignore: Spoofing garbage data
    badTelemetry.gps.lng = 'bogus'

    request
      .post('/vehicles/telemetry')
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
          test.value(result.body.failures.length).is(1)
        }
        done(err)
      })
  })
  it('verifies post telemetry with bad charge', done => {
    const badTelemetry = deepCopy(TEST_TELEMETRY)
    // @ts-ignore: Spoofing garbage data
    badTelemetry.charge = 'bogus'

    request
      .post('/vehicles/telemetry')
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
          test.value(result.body.failures.length).is(1)
        }
        done(err)
      })
  })
  it('verifies post telemetry with bad gps.lng', done => {
    const badTelemetry = deepCopy(TEST_TELEMETRY)
    // @ts-ignore: Spoofing garbage data
    badTelemetry.timestamp = 'bogus'

    request
      .post('/vehicles/telemetry')
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
          test.value(result.body.failures.length).is(1)
        }
        done(err)
      })
  })
  it('verifies post telemetry with mismatched provider', done => {
    request
      .post('/vehicles/telemetry')
      .set('Authorization', AUTH2)
      .send({
        data: [TEST_TELEMETRY]
      })
      .expect(400)
      .end((err, result) => {
        if (err) {
          log('telemetry err', err)
        } else {
          log('telemetry result', result.body)
          test.value(result.body.failures.length).is(1)
        }
        done(err)
      })
  })
  it('verifies get device readback w/telemetry success (database)', done => {
    request
      .get(`/vehicles/${DEVICE_UUID}`)
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        log('----------', result.body)
        const deviceA = result.body
        test.value(deviceA.device_id).is(DEVICE_UUID)
        test.value(deviceA.provider_id).is(TEST1_PROVIDER_ID)
        test.value(deviceA.gps.lat).is(TEST_TELEMETRY.gps.lat)
        test.value(deviceA.status).is(VEHICLE_STATUSES.available)
        test.value(deviceA.prev_event).is(VEHICLE_EVENTS.cancel_reservation)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verifies get device readback w/telemetry success (cache)', done => {
    request
      .get(`/vehicles/${DEVICE_UUID}?cached=true`)
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        log('----------readback telemetry success', result.body)
        const deviceB = result.body
        test.value(deviceB.device_id).is(DEVICE_UUID)
        test.value(deviceB.provider_id).is(TEST1_PROVIDER_ID)
        test.value(deviceB.gps.lat).is(TEST_TELEMETRY.gps.lat)
        test.value(deviceB.status).is(VEHICLE_STATUSES.available)
        test.value(deviceB.prev_event).is(VEHICLE_EVENTS.cancel_reservation)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  /* eslint-disable @typescript-eslint/no-explicit-any */
  it('verifies reading a single service_area', done => {
    request
      .get(`/service_areas/${LA_CITY_BOUNDARY}`)
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        if (err) {
          log('service_area err', err)
          test.value(err).is(undefined) // fail
        } else {
          // log('service_area result', Object.keys(result.body))
          test.object(result.body).match((obj: any) => Array.isArray(obj.service_areas))
          test.object(result.body).match((obj: any) => typeof obj.service_areas[0].service_area_id === 'string')
        }
        done(err)
      })
  })
  /* eslint-enable @typescript-eslint/no-explicit-any */

  it('tries and fails to read a non-existent service_area', done => {
    request
      .get('/service_areas/b4bcc213-4888-48ce-a33d-4dd6c3384bda')
      .set('Authorization', AUTH)
      .expect(404)
      .end((err, result) => {
        log(result.body)
        if (err) {
          log('service_area err', err)
        } else {
          // really only care that we got a 404
        }
        done(err)
      })
  })
  it('verifies you cannot query service_areas that are not UUIDs', done => {
    request
      .get('/service_areas/definitely-not-a-UUID')
      .set('Authorization', AUTH)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.string(result.body.result).contains('invalid service_area_id')
        done(err)
      })
  })

  /* eslint-disable @typescript-eslint/no-explicit-any */
  it('verifies reading all service_areas', done => {
    request
      .get('/service_areas')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        if (err) {
          log('service_areas err', err)
        } else {
          // log('service_areas result', Object.keys(result.body))
          test.object(result.body).match((obj: any) => Array.isArray(obj.service_areas))
          test.object(result.body).match((obj: any) => typeof obj.service_areas[0].service_area_id === 'string')
        }
        done(err)
      })
  })
  /* eslint-enable @typescript-eslint/no-explicit-any */

  it('gets cache info', done => {
    request
      .get('/admin/cache/info')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('refreshes the cache', done => {
    request
      .get('/admin/cache/refresh')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('wipes a vehicle via admin', done => {
    request
      .get(`/admin/wipe/${TEST_VEHICLE.device_id}`)
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('wipes a vehicle via admin that has already been wiped', done => {
    request
      .get(`/admin/wipe/${TEST_VEHICLE.device_id}`)
      .set('Authorization', AUTH)
      .expect(404)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('fails to wipe a vehicle via admin', done => {
    request
      .get('/admin/wipe/' + 'bogus')
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
    await Promise.all([db.initialize(), cache.initialize()])
    await Promise.all([cache.seed(seedData), db.seed(seedData)])
  })

  it('verifies paging links when read back all devices from db', done => {
    request
      .get('/vehicles?skip=2&take=5&foo=bar')
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
      .get('/vehicles?skip=20000&take=5')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.string(result.body.links.first).contains('http')
        test.string(result.body.links.last).contains('http')
        test.value(result.body.links.next).is(null)
        done(err)
      })
  })
})
