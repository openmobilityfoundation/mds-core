/* eslint-disable promise/no-callback-in-promise */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/no-nesting */
/* eslint-disable promise/always-return */
/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable @typescript-eslint/no-floating-promises */
import supertest from 'supertest'
import test from 'unit.js'
import db from '@mds-core/mds-db'
import { ApiServer } from '@mds-core/mds-api-server'
import { PROVIDER_UUID } from '@mds-core/mds-test-data'
import { providers } from '@mds-core/mds-providers'
import uuid from 'uuid'
import { PROPULSION_TYPES, VEHICLE_TYPES } from '@mds-core/mds-types'
import { api } from '../api'

const PROVIDER_SCOPES = 'admin:all test:all'
const PROVIDER_AUTH = `basic ${Buffer.from(`${PROVIDER_UUID}|`).toString('base64')}`
const ADMIN_AUTH = `basic ${Buffer.from(`${PROVIDER_UUID}|${PROVIDER_SCOPES}`).toString('base64')}`
const APP_JSON = 'application/json; charset=utf-8'

const provider_id = PROVIDER_UUID
const device_id = uuid()

const request = supertest(ApiServer(api))

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
      .end((err1, result1) => {
        test.value(result1).hasHeader('content-type', APP_JSON)
        test.object(result1.body).hasProperty('version')
        test.object(result1.body).hasProperty('events')
        test.value(result1.body.events.length).is(1)
        test.object(result1.body.events[0]).hasProperty('device_id', device_id)
        test.object(result1.body).hasProperty('cursor')
        if (err1) {
          done(err1)
        } else {
          request
            .get(`/native/events/${result1.body.cursor}`)
            .set('Authorization', PROVIDER_AUTH)
            .expect(200)
            .end((err2, result2) => {
              test.value(result2).hasHeader('content-type', APP_JSON)
              test.object(result2.body).hasProperty('version')
              test.object(result2.body).hasProperty('events')
              test.value(result2.body.events.length).is(0)
              test.object(result2.body).hasProperty('cursor', result1.body.cursor)
              if (err2) {
                done(err2)
              } else {
                request
                  .get(`/native/events/${result1.body.cursor}?provider_id=invalid-filter-with-cursor`)
                  .set('Authorization', PROVIDER_AUTH)
                  .expect(400)
                  .end(err3 => {
                    test.value(result2).hasHeader('content-type', APP_JSON)
                    done(err3)
                  })
              }
            })
        }
      })
  })

  it('Get events (Bad Request)', done => {
    request
      .get('/native/events?provider_id=invalid-provider-id')
      .set('Authorization', PROVIDER_AUTH)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('Get events (Bad Cursor)', done => {
    request
      .get('/native/events/invalid-cursor')
      .set('Authorization', PROVIDER_AUTH)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('Get Vehicle', done => {
    request
      .get(`/native/vehicles/${device_id}`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('vehicle')
        test.object(result.body.vehicle).hasProperty('device_id', device_id)
        done(err)
      })
  })

  it('Get Vehicle (not found)', done => {
    request
      .get(`/native/vehicles/${uuid()}`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(404)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('Get Vehicle (bad request)', done => {
    request
      .get(`/native/vehicles/invalid-device-id`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('Get Providers', done => {
    request
      .get(`/native/providers`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('providers')
        test.value(result.body.providers.length).is(Object.keys(providers).length)
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
