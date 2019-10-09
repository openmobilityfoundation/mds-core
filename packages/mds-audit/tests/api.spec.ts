/* eslint-disable promise/no-callback-in-promise */
/* eslint-disable promise/no-nesting */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/always-return */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable promise/catch-or-return */
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
import {
  Device,
  Timestamp,
  Telemetry,
  VEHICLE_EVENTS,
  AUDIT_EVENT_TYPES,
  PROPULSION_TYPES,
  VEHICLE_TYPES
} from '@mds-core/mds-types'
import { makeEventsWithTelemetry, makeDevices, makeTelemetryInArea, SCOPED_AUTH } from '@mds-core/mds-test-data'
import { now, rangeRandomInt } from '@mds-core/mds-utils'
import cache from '@mds-core/mds-cache'
import test from 'unit.js'
import uuid from 'uuid'
import { ApiServer } from '@mds-core/mds-api-server'
import db from '@mds-core/mds-db'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import { api } from '../api'

const request = supertest(ApiServer(api))

const APP_JSON = 'application/json; charset=utf-8'

const audit_trip_id = uuid()
const audit_trip_id_2 = uuid()
const audit_device_id: string = uuid()
const provider_id = MOCHA_PROVIDER_ID
const provider_device_id = uuid()
const provider_vehicle_id = 'test-vehicle'

const SAN_FERNANDO_VALLEY = 'e3ed0a0e-61d3-4887-8b6a-4af4f3769c14'
const CANALS = '43f329fc-335a-4495-b542-6b516def9269'

const telemetry = (): {} => ({
  provider_id,
  device_id: audit_device_id,
  timestamp: Date.now(),
  gps: { lat: 37.4230723, lng: -122.13742939999999 }
})

const AUDIT_START = Date.now()

const audit_subject_id = 'user@mds-testing.info'

before('Initializing Database', async () => {
  await Promise.all([db.initialize(), cache.initialize()])
})

describe('Testing API', () => {
  before(done => {
    const timestamp = Date.now()
    db.writeDevice({
      device_id: provider_device_id,
      provider_id,
      vehicle_id: provider_vehicle_id,
      propulsion: [PROPULSION_TYPES.electric],
      type: VEHICLE_TYPES.scooter,
      recorded: timestamp
    }).then(() => {
      db.writeEvent({
        provider_id,
        device_id: provider_device_id,
        event_type: 'trip_start',
        telemetry: {
          provider_id,
          device_id: provider_device_id,
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

  it('verify audit start (matching vehicle)', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/start`)
      .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
      .send({
        audit_event_id: uuid(),
        timestamp: AUDIT_START,
        provider_id,
        provider_vehicle_id,
        audit_device_id,
        telemetry: telemetry()
      })
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result).hasProperty('body')
        test.object(result.body).hasProperty('provider_device')
        test.object(result.body.provider_device).hasProperty('vehicle_id')
        test.value(result.body.provider_device.vehicle_id).is(provider_vehicle_id)
        done(err)
      })
  })

  it('verify audit start (conflict)', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/start`)
      .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
      .expect(409)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verify audit start (no scope)', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/start`)
      .set('Authorization', SCOPED_AUTH([], ''))
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verify audit issue event', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/event`)
      .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
      .send({
        audit_event_id: uuid(),
        audit_event_type: AUDIT_EVENT_TYPES.issue,
        audit_issue_code: 'vehicle_not_found',
        note: '',
        timestamp: Date.now(),
        telemetry: telemetry()
      })
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.value(result.body).is({})
        done(err)
      })
  })

  it('verify audit issue event (no scope)', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/event`)
      .set('Authorization', SCOPED_AUTH([], ''))
      .send({
        audit_event_id: uuid(),
        audit_event_type: AUDIT_EVENT_TYPES.issue,
        audit_issue_code: 'vehicle_not_found',
        note: '',
        timestamp: Date.now(),
        telemetry: telemetry()
      })
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verify trip start event', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/vehicle/event`)
      .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
      .send({
        event_type: VEHICLE_EVENTS.trip_start,
        timestamp: Date.now(),
        trip_id: audit_trip_id,
        telemetry: telemetry()
      })
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.value(result.body).is({})
        done(err)
      })
  })

  it('verify audit telemetry', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/vehicle/telemetry`)
      .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
      .send({
        telemetry: telemetry(),
        timestamp: Date.now()
      })
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.value(result.body).is({})
        done(err)
      })
  })

  it('verify audit telemetry (no scope)', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/vehicle/telemetry`)
      .set('Authorization', SCOPED_AUTH([], ''))
      .send({
        telemetry: telemetry(),
        timestamp: Date.now()
      })
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verify trip end event', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/vehicle/event`)
      .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
      .send({
        event_type: VEHICLE_EVENTS.trip_end,
        timestamp: Date.now(),
        trip_id: audit_trip_id,
        telemetry: telemetry()
      })
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.value(result.body).is({})
        done(err)
      })
  })

  it('verify audit summary event', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/event`)
      .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
      .send({
        audit_event_id: uuid(),
        audit_event_type: AUDIT_EVENT_TYPES.summary,
        note: 'This audit test passed!!',
        timestamp: Date.now(),
        telemetry: telemetry()
      })
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.value(result.body).is({})
        done(err)
      })
  })

  it('verify audit end', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/end`)
      .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
      .send({
        audit_event_id: uuid(),
        timestamp: Date.now(),
        telemetry: telemetry()
      })
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.value(result.body).is({})
        done(err)
      })
  })

  it('verify audit end (no scope)', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/end`)
      .set('Authorization', SCOPED_AUTH([], ''))
      .send({
        audit_event_id: uuid(),
        timestamp: Date.now(),
        telemetry: telemetry()
      })
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verify get audit (matched vehicle)', done => {
    request
      .get(`/audit/trips/${audit_trip_id}`)
      .set('Authorization', SCOPED_AUTH(['audits:read'], audit_subject_id))
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.value(result.body.events.length).is(7)
        test.value(result.body.events[0].provider_event_id).is(1)
        test.value(result.body.events[0].provider_event_type).is('trip_start')
        test.value(result.body.events[0].provider_event_type_reason).is(null)
        done(err)
      })
  })

  const routes = ['note', 'vehicle/event', 'vehicle/telemetry', 'end'].map(path => `/audit/trips/${uuid()}/${path}`)

  routes.forEach(route =>
    it(`verify post audit (not found) ${route}`, done => {
      request
        .post(route)
        .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })
  )

  it(`verify get audit (no scope)`, done => {
    request
      .get(`/audit/trips/${uuid()}`)
      .set('Authorization', SCOPED_AUTH([], ''))
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it(`verify get audit (not found)`, done => {
    request
      .get(`/audit/trips/${uuid()}`)
      .set('Authorization', SCOPED_AUTH(['audits:read'], audit_subject_id))
      .expect(404)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it(`verify list audits (no scope)`, done => {
    request
      .get(`/audit/trips`)
      .set('Authorization', SCOPED_AUTH([], ''))
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  const queries = [
    { filter: 'verify audit list (unfiltered)', query: ``, count: 1 },
    { filter: 'provider_id', query: `?provider_id=${provider_id}`, count: 1 },
    { filter: 'provider_id', query: `?provider_id=${uuid()}`, count: 0 },
    { filter: 'provider_vehicle_id', query: `?provider_vehicle_id=${provider_vehicle_id.substring(4)}`, count: 1 },
    { filter: 'provider_vehicle_id', query: `?provider_vehicle_id=not-found`, count: 0 },
    { filter: 'audit_subject_id', query: `?audit_subject_id=${audit_subject_id}`, count: 1 },
    { filter: 'audit_subject_id', query: `?audit_subject_id=not-found`, count: 0 },
    { filter: 'start_time', query: `?start_time=${AUDIT_START}`, count: 1 },
    { filter: 'start_time', query: `?start_time=${Date.now()}`, count: 0 },
    { filter: 'end_time', query: `?end_time=${Date.now()}`, count: 1 },
    { filter: 'end_time', query: `?end_time=${AUDIT_START - 1}`, count: 0 }
  ]

  queries.forEach(({ filter, query, count }) =>
    it(`verify list audits (Filter: ${filter}, Count: ${count})`, done => {
      request
        .get(`/audit/trips${query}`)
        .set('Authorization', SCOPED_AUTH(['audits:read'], audit_subject_id))
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.value(result.body.count).is(count)
          test.value(result.body.audits.length).is(count)
          done(err)
        })
    })
  )

  it('verify delete audit (no scope)', done => {
    request
      .delete(`/audit/trips/${uuid()}`)
      .set('Authorization', SCOPED_AUTH([], ''))
      .expect(403)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verify delete audit (not found)', done => {
    request
      .delete(`/audit/trips/${uuid()}`)
      .set('Authorization', SCOPED_AUTH(['audits:delete'], audit_subject_id))
      .expect(404)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verify delete audit', done => {
    request
      .delete(`/audit/trips/${audit_trip_id}`)
      .set('Authorization', SCOPED_AUTH(['audits:delete'], audit_subject_id))
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.value(result.body).is({})
        done(err)
      })
  })

  it('verify audit start (missing vehicle)', done => {
    request
      .post(`/audit/trips/${audit_trip_id_2}/start`)
      .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
      .send({
        audit_event_id: uuid(),
        timestamp: AUDIT_START,
        provider_id,
        provider_vehicle_id: uuid(),
        audit_device_id,
        telemetry: telemetry()
      })
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result).hasProperty('body')
        test.object(result.body).hasProperty('provider_device')
        test.value(result.body.provider_device).is(null)
        done(err)
      })
  })

  it('verify get audit (missing vehicle)', done => {
    request
      .get(`/audit/trips/${audit_trip_id_2}`)
      .set('Authorization', SCOPED_AUTH(['audits:read'], audit_subject_id))
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.value(result.body.events.length).is(1)
        done(err)
      })
  })

  const vehicles = [
    provider_vehicle_id, // test-vehicle
    provider_vehicle_id.toUpperCase(), // TEST-VEHICLE
    provider_vehicle_id
      .replace('-', '_')
      .split('')
      .join('-'), // t-e-s-t-_-v-e-h-i-c-l-e
    provider_vehicle_id
      .split('')
      .map((char, index) => (index % 2 ? char.toLowerCase() : char.toUpperCase()))
      .join('') // TeSt-vEhIcLe
  ]
  vehicles.forEach(vehicle_id =>
    it(`verify vehicle matching ${vehicle_id}`, done => {
      request
        .post(`/audit/trips/${uuid()}/start`)
        .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
        .send({
          audit_event_id: uuid(),
          timestamp: AUDIT_START,
          provider_id,
          provider_vehicle_id: vehicle_id,
          audit_device_id,
          telemetry: telemetry()
        })
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.object(result).hasProperty('body')
          test.object(result.body).hasProperty('provider_device')
          test.object(result.body.provider_device).hasProperty('vehicle_id')
          test.value(result.body.provider_device.vehicle_id).is(provider_vehicle_id)
          done(err)
        })
    })
  )
  describe('Tests retreiving vehicles inside of bbox', () => {
    before(done => {
      const devices_a = makeDevices(10, now(), MOCHA_PROVIDER_ID)
      const events_a = makeEventsWithTelemetry(devices_a, now(), SAN_FERNANDO_VALLEY, VEHICLE_EVENTS.trip_start) // Generate a bunch of events outside of our BBOX
      const devices_b = makeDevices(10, now(), MOCHA_PROVIDER_ID)
      const events_b = makeEventsWithTelemetry(devices_b, now(), CANALS, VEHICLE_EVENTS.trip_start) // Generate a bunch of events inside of our BBOX
      const telemetry_a = devices_a.map(device =>
        makeTelemetryInArea(device, now(), SAN_FERNANDO_VALLEY, rangeRandomInt(10))
      )
      const telemetry_b = devices_b.map(device => makeTelemetryInArea(device, now(), CANALS, rangeRandomInt(10)))

      const seedData = {
        devices: [...devices_a, ...devices_b],
        events: [...events_a, ...events_b],
        telemetry: [...telemetry_a, ...telemetry_b]
      }
      Promise.all([db.initialize(), cache.initialize()]).then(() => {
        Promise.all([cache.seed(seedData), db.seed(seedData)]).then(() => {
          done()
        })
      })
    })

    it('Verify getting vehicles inside of a bounding box', done => {
      const bbox = [[-118.484776, 33.996855], [-118.452283, 33.96299]] // BBOX encompasses the entirity of CANALS
      request
        .get(`/vehicles?bbox=${JSON.stringify(bbox)}`)
        .set('Authorization', SCOPED_AUTH(['audits:vehicles:read'], audit_subject_id))
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.assert(result.body.vehicles.length === 10)
          result.body.vehicles.forEach((device: Device & { updated?: Timestamp | null; telemetry: Telemetry }) => {
            test.assert(typeof device.telemetry.gps.lat === 'number')
            test.assert(typeof device.telemetry.gps.lng === 'number')
            test.assert(typeof device.updated === 'number')
          })
          done(err)
        })
    })
  })

  it('Verify get vehicle by vehicle_id and provider_id', done => {
    request
      .get(`/audit/vehicles/${provider_id}/vin/${provider_vehicle_id}`)
      .set('Authorization', SCOPED_AUTH(['audits:vehicles:read'], audit_subject_id))
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result).hasProperty('body')
        test.value(result.body[0].provider_id).is(provider_id)
        test.value(result.body[0].vehicle_id).is(provider_vehicle_id)
        done(err)
      })
  })

  it('Verify get vehicle by vehicle_id and provider_id (not found)', done => {
    request
      .get(`/audit/vehicles/${uuid()}/vin/${provider_vehicle_id}`)
      .set('Authorization', SCOPED_AUTH(['audits:vehicles:read'], audit_subject_id))
      .expect(404)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
})

after('Shutting down Database/Cache', async () => {
  await Promise.all([db.shutdown(), cache.shutdown()])
})
