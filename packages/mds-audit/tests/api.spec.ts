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
  Attachment,
  Audit,
  AuditAttachment,
  Device,
  Telemetry,
  Timestamp,
  AUDIT_EVENT_TYPES,
  PROPULSION_TYPES,
  VEHICLE_EVENTS,
  VEHICLE_REASONS,
  VEHICLE_TYPES
} from '@mds-core/mds-types'
import { makeEventsWithTelemetry, makeDevices, makeTelemetryInArea, SCOPED_AUTH } from '@mds-core/mds-test-data'
import { NotFoundError, now, rangeRandomInt, uuid } from '@mds-core/mds-utils'
import cache from '@mds-core/mds-cache'
import test from 'unit.js'
import { ApiServer } from '@mds-core/mds-api-server'
import db from '@mds-core/mds-db'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import Sinon from 'sinon'
import { api } from '../api'
import * as attachments from '../attachments'

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
const OLD_EVENT = Date.now() - 60000

const audit_subject_id = 'user@mds-testing.info'

before('Initializing Database', async () => {
  await Promise.all([db.initialize(), cache.initialize()])
})

describe('Testing API', () => {
  before(done => {
    const baseEvent = {
      provider_id,
      device_id: provider_device_id,
      event_type: VEHICLE_EVENTS.agency_drop_off,
      event_type_reason: VEHICLE_REASONS.rebalance,
      telemetry_timestamp: AUDIT_START,
      trip_id: uuid(),
      timestamp: AUDIT_START,
      recorded: AUDIT_START
    }
    const baseTelemetry = {
      provider_id,
      device_id: provider_device_id,
      timestamp: AUDIT_START,
      recorded: AUDIT_START,
      charge: 0.5,
      gps: {
        lat: 37.4230723,
        lng: -122.137429,
        speed: 0,
        hdop: 1,
        heading: 180
      }
    }
    db.writeDevice({
      device_id: provider_device_id,
      provider_id,
      vehicle_id: provider_vehicle_id,
      propulsion: [PROPULSION_TYPES.electric],
      type: VEHICLE_TYPES.scooter,
      recorded: AUDIT_START
    }).then(() => {
      db.writeEvent({
        ...baseEvent,
        ...{ telemetry_timestamp: OLD_EVENT, timestamp: OLD_EVENT }
      })
      db.writeEvent(baseEvent)
      db.writeTelemetry([
        {
          ...baseTelemetry,
          ...{ timestamp: OLD_EVENT, recorded: OLD_EVENT }
        },
        {
          ...baseTelemetry,
          ...{ timestamp: AUDIT_START, recorded: AUDIT_START }
        }
      ]).then(() => done())
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

  it('verify get audit (matched vehicle)', done => {
    request
      .get(`/audit/trips/${audit_trip_id}`)
      .set('Authorization', SCOPED_AUTH(['audits:read'], audit_subject_id))
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.value(result.body.events.length).is(7)
        test.value(result.body.provider_event_type).is(VEHICLE_EVENTS.agency_drop_off)
        test.value(result.body.provider_event_type_reason).is(VEHICLE_REASONS.rebalance)
        test.value(result.body.provider_status).is('available')
        test.value(result.body.provider_telemetry.charge).is(0.5)
        test.value(result.body.provider_event_time).is(AUDIT_START)
        done(err)
      })
  })

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
    provider_vehicle_id.replace('-', '_').split('').join('-'), // t-e-s-t-_-v-e-h-i-c-l-e
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
  describe('Tests retreiving vehicles', () => {
    let devices_a: Device[] // Have events and telemetry outside our BBOX
    let devices_b: Device[] // Have events and telemetry inside our BBOX
    let devices_c: Device[] // No events or telemetry
    before(done => {
      devices_a = makeDevices(10, now(), MOCHA_PROVIDER_ID)
      const events_a = makeEventsWithTelemetry(devices_a, now(), SAN_FERNANDO_VALLEY, VEHICLE_EVENTS.trip_start)
      const telemetry_a = devices_a.map(device =>
        makeTelemetryInArea(device, now(), SAN_FERNANDO_VALLEY, rangeRandomInt(10))
      )
      devices_b = makeDevices(10, now(), MOCHA_PROVIDER_ID)
      const events_b = makeEventsWithTelemetry(devices_b, now(), CANALS, VEHICLE_EVENTS.trip_start)
      const telemetry_b = devices_b.map(device => makeTelemetryInArea(device, now(), CANALS, rangeRandomInt(10)))
      devices_c = makeDevices(10, now(), MOCHA_PROVIDER_ID)

      const seedData = {
        // Include a duplicate device (same vin + provider but different device_id)
        devices: [...devices_a, ...devices_b, ...devices_c, { ...devices_c[0], ...{ device_id: uuid() } }],
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
      const bbox = [
        [-118.484776, 33.996855],
        [-118.452283, 33.96299]
      ] // BBOX encompasses the entirity of CANALS
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

    it('Verify get vehicle by vehicle_id and provider_id', done => {
      request
        .get(`/audit/vehicles/${devices_a[0].provider_id}/vin/${devices_a[0].vehicle_id}`)
        .set('Authorization', SCOPED_AUTH(['audits:vehicles:read'], audit_subject_id))
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.object(result).hasProperty('body')
          test.object(result.body).hasProperty('vehicles')
          test.value(result.body.vehicles[0].provider_id).is(devices_a[0].provider_id)
          test.value(result.body.vehicles[0].vehicle_id).is(devices_a[0].vehicle_id)
          test.value(result.body.vehicles[0].updated).is(result.body.vehicles[0].timestamp)
          test.value(result.body.vehicles[0].status).is('trip')
          test.value(result.body.vehicles[0].telemetry.charge > 0).is(true)
          done(err)
        })
    })

    it('Verify get vehicle by vehicle_id and provider_id (not found)', done => {
      request
        .get(`/audit/vehicles/${uuid()}/vin/${devices_a[0].vehicle_id}`)
        .set('Authorization', SCOPED_AUTH(['audits:vehicles:read'], audit_subject_id))
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('Verify get vehicle by vehicle_id and provider_id (no event or telemetry)', done => {
      request
        .get(`/audit/vehicles/${devices_c[0].provider_id}/vin/${devices_c[0].vehicle_id}`)
        .set('Authorization', SCOPED_AUTH(['audits:vehicles:read'], audit_subject_id))
        .expect(200)
        .end((err, result) => {
          test.value(result.body.vehicles[0].provider_id).is(devices_c[0].provider_id)
          test.value(result.body.vehicles[0].vehicle_id).is(devices_c[0].vehicle_id)
          test.object(result.body.vehicles[0]).hasNotProperty('status')
          done(err)
        })
    })

    it('Verify get vehicle by vehicle_id and provider_id (duplicate device)', done => {
      request
        .get(`/audit/vehicles/${devices_c[0].provider_id}/vin/${devices_c[0].vehicle_id}`)
        .set('Authorization', SCOPED_AUTH(['audits:vehicles:read'], audit_subject_id))
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.object(result).hasProperty('body')
          test.object(result.body).hasProperty('vehicles')
          test.value(result.body.vehicles[0].provider_id).is(devices_c[0].provider_id)
          test.value(result.body.vehicles[0].vehicle_id).is(devices_c[0].vehicle_id)
          test.value(result.body.vehicles[0].device_id).isNot(devices_c[0].device_id)
          done(err)
        })
    })
  })
  const attachment_id = uuid()
  const baseUrl = 'http://example.com/'
  describe('Tests for attachments', () => {
    before(done => {
      const audit = {
        audit_trip_id,
        audit_device_id,
        audit_subject_id,
        provider_id,
        provider_name: 'test',
        provider_vehicle_id,
        provider_device_id,
        timestamp: AUDIT_START,
        recorded: AUDIT_START
      } as Audit
      const attachment = {
        attachment_id,
        attachment_filename: `${attachment_id}.jpg`,
        base_url: baseUrl,
        mimetype: 'image/jpeg',
        thumbnail_filename: `${attachment_id}.thumbnail.jpg`,
        attachment_mimetype: 'image/jpeg',
        recorded: AUDIT_START
      } as Attachment
      const auditAttachment = {
        attachment_id,
        audit_trip_id,
        recorded: AUDIT_START
      } as AuditAttachment
      Promise.all([db.initialize(), cache.initialize()]).then(async () => {
        await db.writeDevice({
          device_id: provider_device_id,
          provider_id,
          vehicle_id: provider_vehicle_id,
          propulsion: [PROPULSION_TYPES.electric],
          type: VEHICLE_TYPES.scooter,
          recorded: AUDIT_START
        })
        await db.writeAudit(audit)
        await db.writeAttachment(attachment)
        await db.writeAuditAttachment(auditAttachment)
        done()
      })
    })

    afterEach(() => {
      Sinon.restore()
    })

    it('verify get audit by id with attachments', done => {
      request
        .get(`/audit/trips/${audit_trip_id}`)
        .set('Authorization', SCOPED_AUTH(['audits:read'], audit_subject_id))
        .expect(200)
        .end((err, result) => {
          test.value(result.body.attachments[0].attachment_id).is(attachment_id)
          test.value(result.body.attachments[0].attachment_url).is(`http://example.com/${attachment_id}.jpg`)
          test.value(result.body.attachments[0].thumbnail_url).is(`http://example.com/${attachment_id}.thumbnail.jpg`)
          done(err)
        })
    })

    it('verify get trips with attachments', done => {
      request
        .get('/audit/trips')
        .set('Authorization', SCOPED_AUTH(['audits:read'], audit_subject_id))
        .expect(200)
        .end((err, result) => {
          test.value(result.body.audits[0].attachments[0].attachment_id).is(attachment_id)
          test.value(result.body.audits[0].attachments[0].attachment_url).is(`http://example.com/${attachment_id}.jpg`)
          test
            .value(result.body.audits[0].attachments[0].thumbnail_url)
            .is(`http://example.com/${attachment_id}.thumbnail.jpg`)
          done(err)
        })
    })

    it('verify post attachment (audit not found)', done => {
      request
        .post(`/trips/${uuid()}/attach/image%2Fpng`)
        .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
        .send({}) // TODO: include file
        .expect(404)
        .end((err, result) => {
          test.value(result.body.error.name).is('NotFoundError')
          test.value(result.body.error.reason).is('audit not found')
          done(err)
        })
    })

    const attachmentTests = [
      {
        name: 'no file',
        file: 'empty.png',
        status: 400,
        errName: 'ValidationError',
        errReason: 'No attachment found'
      },
      {
        name: 'missing extension',
        file: 'samplepng',
        status: 400,
        errName: 'ValidationError',
        errReason: `Missing file extension in filename samplepng`
      },
      {
        name: 'unsupported mimetype',
        file: 'sample.gif',
        status: 415,
        errName: 'UnsupportedTypeError',
        errReason: `Unsupported mime type image/gif`
      }
    ]

    attachmentTests.forEach(testCase =>
      it(`verify post bad attachment (${testCase.name})`, done => {
        request
          .post(`/trips/${audit_trip_id}/attach/image%2Fpng`)
          .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
          .attach('file', `./tests/${testCase.file}`)
          .expect(testCase.status)
          .end((err, result) => {
            test.value(result.body.error.name).is(testCase.errName)
            test.value(result.body.error.reason).is(testCase.errReason)
            done(err)
          })
      })
    )

    it('verify audit attach (success)', done => {
      const fake = Sinon.fake.returns({
        audit_trip_id,
        attachment_id,
        recorded: AUDIT_START,
        attachment_filename: `${attachment_id}.jpg`,
        base_url: baseUrl,
        mimetype: 'image/jpeg'
      } as Attachment)
      Sinon.replace(attachments, 'writeAttachment', fake)
      request
        .post(`/trips/${audit_trip_id}/attach/image%2Fpng`)
        .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
        .attach('file', `./tests/sample.png`)
        .expect(200)
        .end((err, result) => {
          test.value(result.body.attachment_id).is(attachment_id)
          test.value(result.body.attachment_url).is(`${baseUrl + attachment_id}.jpg`)
          test.value(result.body.thumbnail_url).is('')
          done(err)
        })
    })

    it('verify audit attach (error)', done => {
      const fake = Sinon.fake.returns(null)
      Sinon.replace(attachments, 'writeAttachment', fake)
      request
        .post(`/trips/${audit_trip_id}/attach/image%2Fpng`)
        .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
        .attach('file', `./tests/sample.png`)
        .expect(500)
        .end((err, result) => {
          test.value(result.body.error.name).is('ServerError')
          done(err)
        })
    })

    it('verify audit delete (success)', done => {
      const fake = Sinon.fake.returns(null)
      Sinon.replace(attachments, 'deleteAuditAttachment', fake)
      request
        .delete(`/trips/${audit_trip_id}/attachment/${attachment_id}`)
        .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
        .expect(200)
        .end((err, result) => {
          test.value(result.body).is({})
          done(err)
        })
    })

    it('verify audit delete (not found)', done => {
      const fake = Sinon.fake.throws(new NotFoundError())
      Sinon.replace(attachments, 'deleteAuditAttachment', fake)
      request
        .delete(`/trips/${audit_trip_id}/attachment/${attachment_id}`)
        .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
        .expect(404)
        .end((err, result) => {
          test.value(result.body.error.name).is('NotFoundError')
          done(err)
        })
    })

    it('verify audit delete (error)', done => {
      const fake = Sinon.fake.throws(new Error())
      Sinon.replace(attachments, 'deleteAuditAttachment', fake)
      request
        .delete(`/trips/${audit_trip_id}/attachment/${attachment_id}`)
        .set('Authorization', SCOPED_AUTH(['audits:write'], audit_subject_id))
        .expect(500)
        .end((err, result) => {
          test.value(result.body.error.name).is('ServerError')
          done(err)
        })
    })
  })
})

after('Shutting down Database/Cache', async () => {
  await Promise.all([db.shutdown(), cache.shutdown()])
})
