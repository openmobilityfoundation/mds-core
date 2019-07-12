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
import { VEHICLE_EVENTS, AUDIT_EVENT_TYPES, PROPULSION_TYPES, VEHICLE_TYPES } from 'mds-enums'
import { PROVIDER_UUID, PROVIDER_AUTH, makeEventsWithTelemetry, makeDevices, COMPLIANCE_AUTH } from 'mds-test-data'
import { now } from 'mds-utils'
import { Device, Timestamp, Telemetry } from 'mds'
import cache from 'mds-cache'
import test from 'unit.js'
import uuid from 'uuid'
import { server } from 'mds-api-server'
import db from 'mds-db'
import { api } from '../src/api'

process.env.PATH_PREFIX = '/audit'

const request = supertest(server(api))

const PROVIDER_SCOPES = 'admin:all test:all'
const ADMIN_AUTH = `basic ${Buffer.from(`${PROVIDER_UUID}|${PROVIDER_SCOPES}`).toString('base64')}`

const APP_JSON = 'application/json; charset=utf-8'

const audit_trip_id = uuid()
const audit_trip_id_2 = uuid()
const audit_device_id: string = uuid()
const provider_id = PROVIDER_UUID
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

before('Initializing Database', done => {
  request
    .get('/audit/test/initialize')
    .set('Authorization', ADMIN_AUTH)
    .expect(200)
    .end((err, result) => {
      test.value(result).hasHeader('content-type', APP_JSON)
      done(err)
    })
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
      .set('Authorization', PROVIDER_AUTH)
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
      .set('Authorization', PROVIDER_AUTH)
      .expect(409)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verify audit issue event', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/event`)
      .set('Authorization', PROVIDER_AUTH)
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

  it('verify trip start event', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/vehicle/event`)
      .set('Authorization', PROVIDER_AUTH)
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
      .set('Authorization', PROVIDER_AUTH)
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

  it('verify trip end event', done => {
    request
      .post(`/audit/trips/${audit_trip_id}/vehicle/event`)
      .set('Authorization', PROVIDER_AUTH)
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
      .set('Authorization', PROVIDER_AUTH)
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
      .set('Authorization', PROVIDER_AUTH)
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

  it('verify read audit (matched vehicle)', done => {
    request
      .get(`/audit/trips/${audit_trip_id}`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.value(result.body.events.length).is(7)
        done(err)
      })
  })

  const routes = ['note', 'vehicle/event', 'vehicle/telemetry', 'end'].map(path => `/audit/trips/${uuid()}/${path}`)

  routes.forEach(route =>
    it(`verify post audit (not found) ${route}`, done => {
      request
        .post(route)
        .set('Authorization', PROVIDER_AUTH)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })
  )

  it(`verify get audit (not found)`, done => {
    request
      .get(`/audit/trips/${uuid()}`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(404)
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
    { filter: 'audit_subject_id', query: `?audit_subject_id=clients`, count: 1 },
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
        .set('Authorization', PROVIDER_AUTH)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.value(result.body.count).is(count)
          test.value(result.body.audits.length).is(count)
          done(err)
        })
    })
  )

  it('verify delete audit (not found)', done => {
    request
      .delete(`/audit/trips/${uuid()}`)
      .set('Authorization', PROVIDER_AUTH)
      .expect(404)
      .end(err => {
        done(err)
      })
  })

  it('verify delete audit', done => {
    request
      .delete(`/audit/trips/${audit_trip_id}`)
      .set('Authorization', PROVIDER_AUTH)
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
      .set('Authorization', PROVIDER_AUTH)
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

  it('verify read audit (missing vehicle)', done => {
    request
      .get(`/audit/trips/${audit_trip_id_2}`)
      .set('Authorization', PROVIDER_AUTH)
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
        .set('Authorization', PROVIDER_AUTH)
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
      const devices_a = makeDevices(10, now(), PROVIDER_UUID)
      const events_a = makeEventsWithTelemetry(devices_a, now(), SAN_FERNANDO_VALLEY) // Generate a bunch of events outside of our BBOX
      const devices_b = makeDevices(10, now(), PROVIDER_UUID)
      const events_b = makeEventsWithTelemetry(devices_b, now(), CANALS) // Generate a bunch of events inside of our BBOX

      const seedData = { devices: [...devices_a, ...devices_b], events: [...events_a, ...events_b], telemetry: [] }
      Promise.all([db.initialize(), cache.initialize()]).then(() => {
        Promise.all([cache.seed(seedData), db.seed(seedData)]).then(() => {
          done()
        })
      })
    })

    it('Verify getting vehicles inside of a bounding box', done => {
      const bbox = [[-118.484776, 33.996855], [-118.452283, 33.96299]] // BBOX encompasses the entirity of CANALS
      request
        .get(`/vehicles?bbox=${JSON.stringify(bbox)}&provider_id=${PROVIDER_UUID}`)
        .set('Authorization', COMPLIANCE_AUTH)
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

    it('Verifies proper pagination when getting vehicles inside of a bounding box', done => {
      const bbox = [[-118.484776, 33.996855], [-118.452283, 33.96299]] // BBOX encompasses the entirity of CANALS
      request
        .get(`/vehicles?bbox=${JSON.stringify(bbox)}&skip=2&take=5`)
        .set('Authorization', COMPLIANCE_AUTH)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.assert(result.body.vehicles.length === 5)
          result.body.vehicles.forEach((device: Device & { updated?: Timestamp | null; telemetry: Telemetry }) => {
            test.assert(typeof device.telemetry.gps.lat === 'number')
            test.assert(typeof device.telemetry.gps.lng === 'number')
            test.assert(typeof device.updated === 'number')
          })
          test.string(result.body.links.next).contains('http', 'skip=7&take=5')
          done(err)
        })
    })

    it('Verifies cannot read past the end when getting vehicles inside of a bounding box', done => {
      const bbox = [[-118.484776, 33.996855], [-118.452283, 33.96299]] // BBOX encompasses the entirity of CANALS
      request
        .get(`/vehicles?bbox=${JSON.stringify(bbox)}&skip=10&take=5`)
        .set('Authorization', COMPLIANCE_AUTH)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.assert(result.body.vehicles.length === 0)
          test.string(result.body.links.last).contains('http', 'skip=10&take=5')
          done(err)
        })
    })
  })
})

after('Shutting down Database', done => {
  request
    .get('/audit/test/shutdown')
    .set('Authorization', ADMIN_AUTH)
    .expect(200)
    .end((err, result) => {
      test.value(result).hasHeader('content-type', APP_JSON)
      done(err)
    })
})
