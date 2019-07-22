import supertest from 'supertest'
import test from 'unit.js'
import db from 'mds-db'
import { server } from 'mds-api-server'
import { PROVIDER_UUID } from 'mds-test-data'
import uuid from 'uuid'
import { PROPULSION_TYPES, VEHICLE_TYPES } from 'mds-types'
import { api } from '../api'

process.env.PATH_PREFIX = '/native'
const PROVIDER_SCOPES = 'admin:all test:all'
const PROVIDER_AUTH = `basic ${Buffer.from(`${PROVIDER_UUID}|`).toString('base64')}`
const ADMIN_AUTH = `basic ${Buffer.from(`${PROVIDER_UUID}|${PROVIDER_SCOPES}`).toString('base64')}`
const APP_JSON = 'application/json; charset=utf-8'

const provider_id = PROVIDER_UUID
const device_id = uuid()

const request = supertest(server(api))

before('Initializing Database', done => {
  request
    .get('/native/test/initialize')
    .set('Authorization', ADMIN_AUTH)
    .expect(200)
    .end((err, result) => {
      test.value(result).hasHeader('content-type', APP_JSON)
      done(err)
    })
})

describe('Verify API', () => {
  before(done => {
    const timestamp = Date.now()
    db.writeDevice({
      device_id,
      provider_id,
      vehicle_id: 'test-vehicle',
      propulsion: [PROPULSION_TYPES.electric],
      type: VEHICLE_TYPES.scooter,
      recorded: timestamp
    }).then(() => {
      db.writeEvent({
        provider_id,
        device_id,
        event_type: 'trip_start',
        telemetry: {
          provider_id,
          device_id,
          timestamp,
          gps: { lat: 37.4230723, lng: -122.13742939999999 }
        },
        telemetry_timestamp: timestamp,
        trip_id: uuid(),
        timestamp,
        recorded: timestamp
      }).then(() => done())
    })
  })

  it('Verifies unable to access test if not scoped', done => {
    request
      .get('/test/')
      .set('Authorization', PROVIDER_AUTH)
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('Get events (no authorization)', done => {
    request
      .get('/native/events')
      .expect(401)
      .end(err => {
        done(err)
      })
  })

  it('Get events', done => {
    request
      .get('/native/events')
      .set('Authorization', PROVIDER_AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('data')
        test.value(result.body.data.length).is(1)
        test.object(result.body.data[0]).hasProperty('device_id', device_id)
        done(err)
      })
  })

  it('Get Device', done => {
    request
      .get(`/native/devices/${device_id}`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('data')
        test.value(result.body.data.length).is(1)
        test.object(result.body.data[0]).hasProperty('device_id', device_id)
        done(err)
      })
  })

  it('Get Device (not found)', done => {
    request
      .get(`/native/devices/${uuid()}`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(404)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('Get Device (bad request)', done => {
    request
      .get(`/native/devices/invalid-device-id`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
})

after('Shutting down Database', done => {
  request
    .get('/native/test/shutdown')
    .set('Authorization', ADMIN_AUTH)
    .expect(200)
    .end((err, result) => {
      test.value(result).hasHeader('content-type', APP_JSON)
      done(err)
    })
})
