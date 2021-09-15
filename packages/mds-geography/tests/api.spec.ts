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
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-plusplus */
/* eslint-disable no-useless-concat */
/* eslint-disable prefer-destructuring */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-reason extends object.prototype */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */

import { ApiServer } from '@mds-core/mds-api-server'
import db from '@mds-core/mds-db'
import {
  DISTRICT_SEVEN,
  GEOGRAPHY2_UUID,
  GEOGRAPHY_UUID,
  LA_CITY_BOUNDARY,
  POLICY_UUID,
  SCOPED_AUTH
} from '@mds-core/mds-test-data'
import { Geography } from '@mds-core/mds-types'
import { pathPrefix } from '@mds-core/mds-utils'
import assert from 'assert'
import supertest from 'supertest'
import test from 'unit.js'
import { api } from '../api'
import { GEOGRAPHY_API_DEFAULT_VERSION } from '../types'

const request = supertest(ApiServer(api))

const APP_JSON = 'application/vnd.mds-geography+json; charset=utf-8; version=0.4'
const EMPTY_SCOPE = SCOPED_AUTH([], '')
const EVENTS_READ_SCOPE = SCOPED_AUTH(['events:read'])
const GEOGRAPHIES_READ_PUBLISHED_SCOPE = SCOPED_AUTH(['geographies:read:published'])
const GEOGRAPHIES_READ_UNPUBLISHED_SCOPE = SCOPED_AUTH(['geographies:read:unpublished'])
const GEOGRAPHIES_BOTH_READ_SCOPES = SCOPED_AUTH(['geographies:read:published', 'geographies:read:unpublished'])

describe('Tests app', () => {
  describe('Geography endpoint tests', () => {
    before(async () => {
      await db.reinitialize()
    })

    after(async () => {
      await db.shutdown()
    })

    it('GETs one unpublished geography with unpublished scope', async () => {
      const geography = { name: 'LA', geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY }
      await db.writeGeography(geography)
      const result = await request
        .get(pathPrefix(`/geographies/${GEOGRAPHY_UUID}`))
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
      test.assert(result.body.data.geographies[0].geography_id === GEOGRAPHY_UUID)
      test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('cannot GET an unpublished geography with the published scope', done => {
      request
        .get(pathPrefix(`/geographies/${GEOGRAPHY_UUID}`))
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot GET a nonexistent geography', done => {
      request
        .get(pathPrefix(`/geographies/${POLICY_UUID}`))
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(404)
        .end(err => {
          done(err)
        })
    })

    it('cannot GET geographies (no auth)', done => {
      request
        .get(pathPrefix(`/geographies/`))
        .set('Authorization', EMPTY_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot GET geographies (wrong auth)', done => {
      request
        .get(pathPrefix(`/geographies/`))
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('can GET geographies, full version', done => {
      request
        .get(pathPrefix(`/geographies/`))
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          result.body.data.geographies.forEach((item: Geography) => {
            test.assert(item.geography_json)
          })
          test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('can GET geographies, summarized version', done => {
      request
        .get(pathPrefix(`/geographies?summary=true`))
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          result.body.data.geographies.forEach((item: Geography) => {
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
        .get(pathPrefix(`/geographies/${GEOGRAPHY2_UUID}`))
        .set('Authorization', GEOGRAPHIES_BOTH_READ_SCOPES)
        .expect(200)
    })

    it('can GET one unpublished geography with unpublished scope', done => {
      request
        .get(pathPrefix(`/geographies/${GEOGRAPHY_UUID}`))
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          // console.log('!!!', result.body.data)
          test.assert(result.body.data.geographies[0].geography_id === GEOGRAPHY_UUID)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('can get all geographies, with the unpublished scope', done => {
      request
        .get(pathPrefix(`/geographies`))
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          test.assert(result.body.data.geographies.length === 2)
          test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('can filter for published geographies, with the unpublished scope and get_published parameter', done => {
      request
        .get(pathPrefix(`/geographies?get_published=true`))
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          test.assert(result.body.data.geographies.length === 1)
          test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('can filter for unpublished geographies, with the unpublished scope and get_unpublished parameter', done => {
      request
        .get(pathPrefix(`/geographies?get_unpublished=true`))
        .set('Authorization', GEOGRAPHIES_READ_UNPUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          assert(result.body.data.geographies.length === 1)
          test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('can only GET published geographies, with only the published scope', done => {
      request
        .get(pathPrefix(`/geographies`))
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(200)
        .end((err, result) => {
          assert(result.body.data.geographies.length === 1)
          test.assert(result.body.version === GEOGRAPHY_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('throws an error if only the get_published scope is set and get_unpublished param is set', async () => {
      await request
        .get(pathPrefix(`/geographies?get_unpublished=true`))
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(403)
    })

    it('fails to hit non-existent endpoint with a 404', done => {
      request
        .get(pathPrefix(`/foobar`))
        .set('Authorization', GEOGRAPHIES_READ_PUBLISHED_SCOPE)
        .expect(404)
        .end(err => {
          done(err)
        })
    })
  })
})
