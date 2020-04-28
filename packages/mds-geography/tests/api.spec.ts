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
import { Geography } from '@mds-core/mds-types'
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
import { GEOGRAPHY_API_DEFAULT_VERSION } from '../types'

const request = supertest(ApiServer(api))

const APP_JSON = 'application/vnd.mds-geography+json; charset=utf-8; version=0.1'
const EMPTY_SCOPE = SCOPED_AUTH([], '')
const EVENTS_READ_SCOPE = SCOPED_AUTH(['events:read'])
const GEOGRAPHIES_READ_PUBLISHED_SCOPE = SCOPED_AUTH(['geographies:read:published'])
const GEOGRAPHIES_READ_UNPUBLISHED_SCOPE = SCOPED_AUTH(['geographies:read:unpublished'])
const GEOGRAPHIES_BOTH_READ_SCOPES = SCOPED_AUTH(['geographies:read:published', 'geographies:read:unpublished'])
const sandbox = sinon.createSandbox()

describe('Tests app', () => {
  describe('Geography endpoint tests', () => {
    before(async () => {
      await db.initialize()
    })

    after(async () => {
      await db.shutdown()
    })

    it('GETs one unpublished geography with unpublished scope', async () => {
      const geography = { name: 'LA', geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY }
      await db.writeGeography(geography)
      const result = await request
        .get(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
      test.assert(result.body.geography.geography_id === GEOGRAPHY_UUID)
      test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('cannot GET an unpublished geography with the published scope', done => {
      request
        .get(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot GET a nonexistent geography', done => {
      request
        .get(`/geographies/${POLICY_UUID}`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(404)
        .end(err => {
          done(err)
        })
    })

    it('cannot GET geographies (no auth)', done => {
      request
        .get(`/geographies/`)
        .set('Authorization', EMPTY_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot GET geographies (wrong auth)', done => {
      request
        .get(`/geographies/`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('can GET geographies, full version', done => {
      request
        .get(`/geographies/`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          result.body.geographies.forEach((item: Geography) => {
            test.assert(item.geography_json)
          })
          test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('can GET geographies, summarized version', done => {
      request
        .get(`/geographies?summary=true`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          result.body.geographies.forEach((item: Geography) => {
            test.assert(!item.geography_json)
          })
          test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('can read a published geography with both read scopes', async () => {
      await db.writeGeography({ name: 'Geography 2', geography_id: GEOGRAPHY2_UUID, geography_json: DISTRICT_SEVEN })
      await db.publishGeography({ geography_id: GEOGRAPHY2_UUID })
      await request
        .get(`/geographies/${GEOGRAPHY2_UUID}`)
        .set('Authorization', GEOGRAPHIES_BOTH_READ_SCOPES)
        .expect(200)
    })

    it('can GET one unpublished geography with unpublished scope', done => {
      request
        .get(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          test.assert(result.body.geography.geography_id === GEOGRAPHY_UUID)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('can get all geographies, with the unpublished scope', done => {
      request
        .get(`/geographies`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          test.assert(result.body.geographies.length === 2)
          test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('can filter for published geographies, with the unpublished scope and get_published parameter', done => {
      request
        .get(`/geographies?get_published=true`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          test.assert(result.body.geographies.length === 1)
          test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('can filter for unpublished geographies, with the unpublished scope and get_unpublished parameter', done => {
      request
        .get(`/geographies?get_unpublished=true`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          assert(result.body.geographies.length === 1)
          test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('can only GET published geographies, with only the published scope', done => {
      request
        .get(`/geographies`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          assert(result.body.geographies.length === 1)
          test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('throws an error if only the get_published scope is set and get_unpublished param is set', async () => {
      await request
        .get(`/geographies?get_unpublished=true`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(403)
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

    it('sends the correct error code if it cannot retrieve the metadata', async () => {
      sandbox.stub(db, 'readBulkGeographyMetadata').callsFake(function stubAThrow() {
        throw new Error('err')
      })
      await request
        .get(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(404)
    })

    it('correctly retrieves all geography metadata when using only the unpublished scope', async () => {
      await db.writeGeographyMetadata({ geography_id: GEOGRAPHY_UUID, geography_metadata: { venus: 'ishot' } })
      await db.writeGeographyMetadata({ geography_id: GEOGRAPHY2_UUID, geography_metadata: { earth: 'isround' } })

      const result = await request
        .get(`/geographies/meta`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
      test.assert(result.body.geography_metadata.length === 2)
      test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('retrieves only metadata for published geographies, with the unpublished scope and get_published param', async () => {
      const result = await request
        .get(`/geographies/meta?get_published=true`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
      test.assert(result.body.geography_metadata.length === 1)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('correctly retrieves geography metadata when using the param get_unpublished', async () => {
      const result = await request
        .get(`/geographies/meta?get_unpublished=true`)
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
      test.assert(result.body.geography_metadata.length === 1)
      test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('retrieves all metadata when both scopes are used', async () => {
      const result = await request
        .get(`/geographies/meta`)
        .set('Authorization', GEOGRAPHIES_BOTH_READ_SCOPES)
        .expect(200)
      test.assert(result.body.geography_metadata.length === 2)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('retrieves only metadata for published geographies with both read scopes and the get_published param', async () => {
      const result = await request
        .get(`/geographies/meta?get_published=true`)
        .set('Authorization', GEOGRAPHIES_BOTH_READ_SCOPES)
        .expect(200)
      test.assert(result.body.geography_metadata.length === 1)
      test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('filters out unpublished geo metadata if only the get_published scope is set', async () => {
      const result = await request
        .get(`/geographies/meta`)
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(200)
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
  })
})
