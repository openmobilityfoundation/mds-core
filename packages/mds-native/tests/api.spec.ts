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
import { SCOPED_AUTH } from '@mds-core/mds-test-data'
import { providers, MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import { v4 as uuid } from 'uuid'
import { PROPULSION_TYPES, VEHICLE_EVENTS, VEHICLE_TYPES } from '@mds-core/mds-types'
import { api } from '../api'

const CONTENT_TYPE = 'application/vnd.mds.native+json; charset=utf-8; version=0.1'

const provider_id = MOCHA_PROVIDER_ID
const device_id = uuid()

const request = supertest(ApiServer(api))
const EMPTY_SCOPE = SCOPED_AUTH([], '')
const EVENTS_READ_SCOPE = SCOPED_AUTH(['events:read'], MOCHA_PROVIDER_ID)
const VEHICLES_READ_SCOPE = SCOPED_AUTH(['vehicles:read'], MOCHA_PROVIDER_ID)
const PROVIDERS_READ_SCOPE = SCOPED_AUTH(['providers:read'], MOCHA_PROVIDER_ID)

before('Initializing Database', async () => {
  await db.initialize()
})

describe('Verify API', () => {
  before(done => {
    const timestamp = Date.now()
    const oldTimestamp = timestamp - 60000
    const olderTimestamp = timestamp - 120000
    const baseEvent = {
      provider_id,
      device_id,
      event_type: VEHICLE_EVENTS.trip_start,
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
    }
    db.writeDevice({
      device_id,
      provider_id,
      vehicle_id: 'test-vehicle',
      propulsion: [PROPULSION_TYPES.electric],
      type: VEHICLE_TYPES.scooter,
      recorded: timestamp
    }).then(() => {
      db.writeEvent({
        ...baseEvent,
        ...{ timestamp: olderTimestamp, telemetry_timestamp: olderTimestamp }
      })
      db.writeEvent({
        ...baseEvent,
        ...{ timestamp: oldTimestamp, telemetry_timestamp: oldTimestamp }
      })
      db.writeEvent(baseEvent).then(() => done())
    })
  })

  it('Get Events (no authorization)', done => {
    request
      .get('/native/events')
      .expect(401)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        done(err)
      })
  })

  it('Get Events (no scope)', done => {
    request
      .get('/native/events')
      .set('Authorization', EMPTY_SCOPE)
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        done(err)
      })
  })

  it('Get Events', done => {
    request
      .get('/native/events')
      .set('Authorization', EVENTS_READ_SCOPE)
      .expect(200)
      .end((err1, result1) => {
        test.value(result1).hasHeader('content-type', CONTENT_TYPE)
        test.object(result1.body).hasProperty('version')
        test.object(result1.body).hasProperty('events')
        test.value(result1.body.events.length).is(3)
        test.object(result1.body.events[0]).hasProperty('device_id', device_id)
        test.object(result1.body).hasProperty('cursor')
        test.value(result1.body.cursor).is(Buffer.from(JSON.stringify({ last_id: 3 })).toString('base64'))
        if (err1) {
          done(err1)
        } else {
          request
            .get(`/native/events/${result1.body.cursor}`)
            .set('Authorization', EVENTS_READ_SCOPE)
            .expect(200)
            .end((err2, result2) => {
              test.value(result2).hasHeader('content-type', CONTENT_TYPE)
              test.object(result2.body).hasProperty('version')
              test.object(result2.body).hasProperty('events')
              test.value(result2.body.events.length).is(0)
              test.object(result2.body).hasProperty('cursor', result1.body.cursor)
              if (err2) {
                done(err2)
              } else {
                request
                  .get(`/native/events/${result1.body.cursor}?provider_id=invalid-filter-with-cursor`)
                  .set('Authorization', EVENTS_READ_SCOPE)
                  .expect(400)
                  .end(err3 => {
                    test.value(result2).hasHeader('content-type', CONTENT_TYPE)
                    done(err3)
                  })
              }
            })
        }
      })
  })

  it('Get Events (Bad Request)', done => {
    request
      .get('/native/events?provider_id=invalid-provider-id')
      .set('Authorization', EVENTS_READ_SCOPE)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        done(err)
      })
  })

  it('Get Events (Bad Cursor)', done => {
    request
      .get('/native/events/invalid-cursor')
      .set('Authorization', EVENTS_READ_SCOPE)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        done(err)
      })
  })

  it('Get Vehicle (no authorization)', done => {
    request
      .get(`/native/vehicles/${device_id}`)
      .expect(401)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        done(err)
      })
  })

  it('Get Vehicle (no scope)', done => {
    request
      .get(`/native/vehicles/${device_id}`)
      .set('Authorization', EMPTY_SCOPE)
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        done(err)
      })
  })

  it('Get Vehicle', done => {
    request
      .get(`/native/vehicles/${device_id}`)
      .set('Authorization', VEHICLES_READ_SCOPE)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('vehicle')
        test.object(result.body.vehicle).hasProperty('device_id', device_id)
        done(err)
      })
  })

  it('Get Vehicle (not found)', done => {
    request
      .get(`/native/vehicles/${uuid()}`)
      .set('Authorization', VEHICLES_READ_SCOPE)
      .expect(404)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        done(err)
      })
  })

  it('Get Vehicle (bad request)', done => {
    request
      .get(`/native/vehicles/invalid-device-id`)
      .set('Authorization', VEHICLES_READ_SCOPE)
      .expect(400)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        done(err)
      })
  })

  it('Get Providers (no authorization)', done => {
    request
      .get(`/native/providers`)
      .expect(401)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        done(err)
      })
  })

  it('Get Providers (no scope)', done => {
    request
      .get(`/native/providers`)
      .set('Authorization', EMPTY_SCOPE)
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        done(err)
      })
  })

  it('Get Providers', done => {
    request
      .get(`/native/providers`)
      .set('Authorization', PROVIDERS_READ_SCOPE)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', CONTENT_TYPE)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('providers')
        test.value(result.body.providers.length).is(Object.keys(providers).length)
        done(err)
      })
  })
})

after('Shutting down Database', async () => {
  await db.shutdown()
})
