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

// eslint directives:
/* eslint-disable no-plusplus */
/* eslint-disable no-useless-concat */
/* eslint-disable prefer-destructuring */
/* eslint-disable promise/prefer-await-to-callbacks */

/* eslint-reason extends object.prototype */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import assert from 'assert'
import sinon from 'sinon'
import supertest from 'supertest'
import test from 'unit.js'
import db from '@mds-core/mds-db'
import { uuid } from '@mds-core/mds-utils'
import { ApiServer } from '@mds-core/mds-api-server'
import {
  POLICY_UUID,
  GEOGRAPHY_UUID,
  GEOGRAPHY2_UUID,
  LA_CITY_BOUNDARY,
  DISTRICT_SEVEN,
  SCOPED_AUTH
} from '@mds-core/mds-test-data'
import { api } from '../api'
import { GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION } from '../types'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(ApiServer(api))

const APP_JSON = 'application/vnd.mds.geography-author+json; charset=utf-8; version=0.1'
const EMPTY_SCOPE = SCOPED_AUTH([], '')
const EVENTS_READ_SCOPE = SCOPED_AUTH(['events:read'])
const GEOGRAPHIES_WRITE_SCOPE = SCOPED_AUTH(['geographies:write'])
const GEOGRAPHIES_READ_PUBLISHED_SCOPE = SCOPED_AUTH(['geographies:read:published'])
const GEOGRAPHIES_READ_UNPUBLISHED_SCOPE = SCOPED_AUTH(['geographies:read:unpublished'])
const GEOGRAPHIES_BOTH_READ_SCOPES = SCOPED_AUTH(['geographies:read:published', 'geographies:read:unpublished'])
const GEOGRAPHIES_PUBLISH_SCOPE = SCOPED_AUTH(['geographies:publish'])
const sandbox = sinon.createSandbox()

describe('Tests app', () => {
  describe('Geography endpoint tests', () => {
    afterEach(() => {
      sandbox.restore()
    })

    before(async () => {
      await db.initialize()
    })

    after(async () => {
      await db.shutdown()
    })

    // Geography endpoints
    it('cannot POST one current geography (no auth)', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY }
      request
        .post(`/geographies`)
        .set('Authorization', EMPTY_SCOPE)
        .send(geography)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot POST one current geography (wrong auth)', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY }
      request
        .post(`/geographies`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .send(geography)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('creates one current geography', done => {
      const geography = { name: 'LA', geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY }
      request
        .post(`/geographies`)
        .set('Authorization', GEOGRAPHIES_WRITE_SCOPE)
        .send(geography)
        .expect(201)
        .end((err, result) => {
          const body = result.body
          log('create one geo response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot update one geography (no auth)', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: DISTRICT_SEVEN }
      request
        .put(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', EMPTY_SCOPE)
        .send(geography)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot update one geography (wrong auth)', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: DISTRICT_SEVEN }
      request
        .put(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .send(geography)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('verifies updating one geography', done => {
      const geography = { name: 'LA', geography_id: GEOGRAPHY_UUID, geography_json: DISTRICT_SEVEN }
      request
        .put(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', GEOGRAPHIES_WRITE_SCOPE)
        .send(geography)
        .expect(201)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot PUT geography (no auth)', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: 'garbage_json' }
      request
        .put(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', EMPTY_SCOPE)
        .send(geography)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot PUT geography (wrong auth)', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: 'garbage_json' }
      request
        .put(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .send(geography)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('verifies cannot PUT bad geography', done => {
      const geography = { name: 'LA', geography_id: GEOGRAPHY_UUID, geography_json: 'garbage_json' }
      request
        .put(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', GEOGRAPHIES_WRITE_SCOPE)
        .send(geography)
        .expect(400)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot PUT non-existent geography', done => {
      const geography = { name: 'LA', geography_id: POLICY_UUID, geography_json: DISTRICT_SEVEN }
      request
        .put(`/geographies/${POLICY_UUID}`)
        .set('Authorization', GEOGRAPHIES_WRITE_SCOPE)
        .send(geography)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot POST invalid geography', done => {
      const geography = { name: 'LA', geography_id: GEOGRAPHY_UUID, geography_json: 'garbage_json' }
      request
        .post(`/geographies`)
        .set('Authorization', GEOGRAPHIES_WRITE_SCOPE)
        .send(geography)
        .expect(400)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot POST duplicate geography', done => {
      const geography = { name: 'LA', geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY }
      request
        .post(`/geographies`)
        .set('Authorization', GEOGRAPHIES_WRITE_SCOPE)
        .send(geography)
        .expect(409)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('can publish a geography (correct auth)', async () => {
      await db.writeGeography({ name: 'Geography 2', geography_id: GEOGRAPHY2_UUID, geography_json: DISTRICT_SEVEN })
      const result = await request
        .put(`/geographies/${GEOGRAPHY2_UUID}/publish`)
        .set('Authorization', GEOGRAPHIES_PUBLISH_SCOPE)
        .expect(200)
      test.value(result).hasHeader('content-type', APP_JSON)
      test.assert(result.body.version === GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION)
      test.assert(result.body.geography.geography_id === GEOGRAPHY2_UUID)
      test.assert(result.body.geography.publish_date)
    })

    it('cannot publish a geography (wrong auth)', async () => {
      await request.put(`/geographies/${GEOGRAPHY2_UUID}/publish`).set('Authorization', EMPTY_SCOPE).expect(403)
    })

    it('cannot delete a geography (incorrect auth)', async () => {
      await request.delete(`/geographies/${GEOGRAPHY2_UUID}`).set('Authorization', EMPTY_SCOPE).expect(403)
    })

    it('can delete a geography (correct auth)', async () => {
      const testUUID = uuid()
      await db.writeGeography({ geography_id: testUUID, geography_json: LA_CITY_BOUNDARY, name: 'testafoo' })
      await db.writeGeographyMetadata({ geography_id: testUUID, geography_metadata: { foo: 'afoo' } })
      await request.delete(`/geographies/${testUUID}`).set('Authorization', GEOGRAPHIES_WRITE_SCOPE).expect(200)
      await assert.rejects(
        async () => {
          await db.readSingleGeography(testUUID)
        },
        { name: 'NotFoundError' }
      )
      await assert.rejects(
        async () => {
          await db.readSingleGeographyMetadata(testUUID)
        },
        { name: 'NotFoundError' }
      )
    })

    it('cannot delete a published geography (correct auth)', async () => {
      await request.delete(`/geographies/${GEOGRAPHY2_UUID}`).set('Authorization', GEOGRAPHIES_WRITE_SCOPE).expect(405)
    })

    it('sends the correct error code if something blows up on the backend during delete', async () => {
      sandbox.stub(db, 'deleteGeography').callsFake(function stubAThrow() {
        throw new Error('random backend err')
      })
      await request.delete(`/geographies/${GEOGRAPHY_UUID}`).set('Authorization', GEOGRAPHIES_WRITE_SCOPE).expect(500)
    })
  })

  // Geography metadata endpoints

  describe('Geography metadata endpoint tests', () => {
    afterEach(() => {
      sandbox.restore()
    })

    before(async () => {
      await db.initialize()
      await db.writeGeography({ name: 'Geography 1', geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY })
      await db.writeGeography({ name: 'Geography 2', geography_id: GEOGRAPHY2_UUID, geography_json: DISTRICT_SEVEN })
      await db.publishGeography({ geography_id: GEOGRAPHY2_UUID })
    })

    after(async () => {
      await db.shutdown()
    })

    it('cannot GET geography metadata (no auth)', done => {
      request
        .get(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', EMPTY_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot GET geography metadata (wrong auth)', done => {
      request
        .get(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot PUT geography metadata to create (no auth)', async () => {
      const metadata = { some_arbitrary_thing: 'boop' }
      await request
        .put(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', EMPTY_SCOPE)
        .send({ geography_id: GEOGRAPHY_UUID, geography_metadata: metadata })
        .expect(403)
    })

    it('cannot PUT geography metadata to create (wrong auth)', async () => {
      const metadata = { some_arbitrary_thing: 'boop' }
      await request
        .put(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .send({ geography_id: GEOGRAPHY_UUID, geography_metadata: metadata })
        .expect(403)
    })

    it('sends the correct error code if it cannot retrieve the metadata', async () => {
      sandbox.stub(db, 'readBulkGeographyMetadata').callsFake(function stubAThrow() {
        throw new Error('err')
      })
      await request
        .get(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(404)
    })

    it('verifies PUTing geography metadata to create', async () => {
      const metadata = { some_arbitrary_thing: 'boop' }
      const requestResult = await request
        .put(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', GEOGRAPHIES_WRITE_SCOPE)
        .send({ geography_id: GEOGRAPHY_UUID, geography_metadata: metadata })
        .expect(201)
      test.assert(requestResult.body.version === GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION)
      const result = await db.readSingleGeographyMetadata(GEOGRAPHY_UUID)
      test.assert(result.geography_metadata.some_arbitrary_thing === 'boop')
    })

    it('verifies PUTing geography metadata to edit', async () => {
      const metadata = { some_arbitrary_thing: 'beep' }
      await request
        .put(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', GEOGRAPHIES_WRITE_SCOPE)
        .send({ geography_id: GEOGRAPHY_UUID, geography_metadata: metadata })
        .expect(200)
      const result = await db.readSingleGeographyMetadata(GEOGRAPHY_UUID)
      test.assert(result.geography_metadata.some_arbitrary_thing === 'beep')
    })

    it('verifies that metadata cannot be created without a preexisting geography', async () => {
      const metadata = { some_arbitrary_thing: 'beep' }
      const nonexistentGeoUUID = uuid()
      await request
        .put(`/geographies/${nonexistentGeoUUID}/meta`)
        .set('Authorization', GEOGRAPHIES_WRITE_SCOPE)
        .send({ geography_id: nonexistentGeoUUID, geography_metadata: metadata })
        .expect(404)
    })

    it('correctly retrieves all geography metadata when using only the unpublished scope', async () => {
      await db.writeGeographyMetadata({ geography_id: GEOGRAPHY2_UUID, geography_metadata: { earth: 'isround' } })

      const result = await request
        .get(`/geographies/meta`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
      test.assert(result.body.geography_metadata.length === 2)
      test.assert(result.body.version === GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('retrieves only metadata for published geographies, with the unpublished scope and get_published param', async () => {
      const result = await request
        .get(`/geographies/meta?get_published=true`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
      test.assert(result.body.geography_metadata.length === 1)
      test.assert(result.body.version === GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('correctly retrieves geography metadata when using the param get_unpublished', async () => {
      const result = await request
        .get(`/geographies/meta?get_unpublished=true`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
      test.assert(result.body.geography_metadata.length === 1)
      test.assert(result.body.version === GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('retrieves all metadata when both scopes are used', async () => {
      const result = await request
        .get(`/geographies/meta`)
        .set('Authorization', GEOGRAPHIES_BOTH_READ_SCOPES)
        .expect(200)
      test.assert(result.body.geography_metadata.length === 2)
      test.assert(result.body.version === GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('retrieves only metadata for published geographies with both read scopes and the get_published param', async () => {
      const result = await request
        .get(`/geographies/meta?get_published=true`)
        .set('Authorization', GEOGRAPHIES_BOTH_READ_SCOPES)
        .expect(200)
      test.assert(result.body.geography_metadata.length === 1)
      test.assert(result.body.version === GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('filters out unpublished geo metadata if only the get_published scope is set', async () => {
      const result = await request
        .get(`/geographies/meta`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(200)
      test.assert(result.body.version === GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION)
      test.assert(result.body.geography_metadata.length === 1)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('throws an error if only the get_published scope is set and get_unpublished param is set', async () => {
      await request
        .get(`/geographies/meta?get_unpublished=true`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(403)
    })

    it('cannot do bulk geography metadata reads (wrong auth)', async () => {
      await request.get(`/geographies/meta?get_unpublished=false`).set('Authorization', EVENTS_READ_SCOPE).expect(403)
    })

    it('cannot do bulk geography metadata reads (no auth)', async () => {
      await request.get(`/geographies/meta?get_published=false`).set('Authorization', EMPTY_SCOPE).expect(403)
    })

    it('verifies GETing a published geography metadata throws a permission error if the scope is wrong', done => {
      request
        .get(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('verifies GETing a published geography metadata if the scope is geographies:read:unpublished', done => {
      request
        .get(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          done(err)
        })
    })

    it('verifies cannot GET non-existent geography metadata', done => {
      const nonexistentID = uuid()
      request
        .get(`/geographies/${nonexistentID}/meta`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(404)
        .end((err, result) => {
          test.assert(result.body.error.name === `NotFoundError`)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot PUT geography with a publish_date', done => {
      const geography = {
        name: 'foo',
        geography_id: GEOGRAPHY_UUID,
        publish_date: 1589817834000,
        geography_json: LA_CITY_BOUNDARY
      }
      request
        .put(`/geographies/${geography.geography_id}`)
        .set('Authorization', GEOGRAPHIES_WRITE_SCOPE)
        .send(geography)
        .expect(400)
        .end((err, result) => {
          test.assert(result.body.error.name === `ValidationError`)
          test.assert(result.body.error.reason.includes('publish_date'))
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot POST geography with a publish_date', done => {
      const geography = {
        name: 'foo',
        geography_id: GEOGRAPHY_UUID,
        publish_date: 1589817834000,
        geography_json: LA_CITY_BOUNDARY
      }
      request
        .post(`/geographies`)
        .set('Authorization', GEOGRAPHIES_WRITE_SCOPE)
        .send(geography)
        .expect(400)
        .end((err, result) => {
          test.assert(result.body.error.name === `ValidationError`)
          test.assert(result.body.error.reason.includes('publish_date'))
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })
  })
})
