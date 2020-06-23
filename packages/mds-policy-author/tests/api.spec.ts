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
import should from 'should'
import supertest from 'supertest'
import test from 'unit.js'
import db from '@mds-core/mds-db'
import { clone, isUUID, uuid } from '@mds-core/mds-utils'
import { Policy } from '@mds-core/mds-types'
import { ApiServer } from '@mds-core/mds-api-server'
import {
  POLICY_JSON,
  POLICY2_JSON,
  POLICY3_JSON,
  POLICY_JSON_MISSING_POLICY_ID,
  POLICY_UUID,
  POLICY2_UUID,
  GEOGRAPHY_UUID,
  LA_CITY_BOUNDARY,
  SCOPED_AUTH,
  PUBLISHED_POLICY
} from '@mds-core/mds-test-data'
import { api } from '../api'
import { POLICY_AUTHOR_API_DEFAULT_VERSION } from '../types'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(ApiServer(api))

const APP_JSON = 'application/vnd.mds.policy-author+json; charset=utf-8; version=0.4'
const EMPTY_SCOPE = SCOPED_AUTH([], '')
const EVENTS_READ_SCOPE = SCOPED_AUTH(['events:read'])
const POLICIES_WRITE_SCOPE = SCOPED_AUTH(['policies:write'])
const POLICIES_READ_SCOPE = SCOPED_AUTH(['policies:read'])
const POLICIES_PUBLISH_SCOPE = SCOPED_AUTH(['policies:publish'])
const POLICIES_DELETE_SCOPE = SCOPED_AUTH(['policies:delete'])
const POLICY_JSON_WITHOUT_PUBLISH_DATE = clone(POLICY_JSON)
POLICY_JSON_WITHOUT_PUBLISH_DATE.publish_date = undefined

describe('Tests app', () => {
  describe('Policy tests', () => {
    before(async () => {
      await db.initialize()
    })

    after(async () => {
      await db.shutdown()
    })

    it('cannot create one current policy (no authorization)', done => {
      const policy = POLICY_JSON_WITHOUT_PUBLISH_DATE
      request
        .post(`/policies`)
        .set('Authorization', EMPTY_SCOPE)
        .send(policy)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot create one current policy (wrong authorization)', done => {
      const policy = POLICY_JSON_WITHOUT_PUBLISH_DATE
      request
        .post(`/policies`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .send(policy)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('tries to post invalid policy', done => {
      const bad_policy_json: Policy = clone(POLICY_JSON_WITHOUT_PUBLISH_DATE)
      delete bad_policy_json.rules[0].rule_type
      const bad_policy = bad_policy_json
      request
        .post(`/policies`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(bad_policy)
        .expect(400)
        .end((err, result) => {
          const body = result.body
          test.value(body.error.reason).contains('rule_type')
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot PUT policy (no auth)', done => {
      const policy = clone(POLICY_JSON_WITHOUT_PUBLISH_DATE)
      request
        .put(`/policies/d2e31798-f22f-4034-ad36-1f88621b276a`)
        .set('Authorization', EMPTY_SCOPE)
        .send(policy)
        .expect(403)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot PUT policy (wrong auth)', done => {
      const policy = clone(POLICY_JSON_WITHOUT_PUBLISH_DATE)
      request
        .put(`/policies/d2e31798-f22f-4034-ad36-1f88621b276a`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .send(policy)
        .expect(403)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot PUT non-existent policy', done => {
      request
        .put(`/policies/d2e31798-f22f-4034-ad36-1f88621b276a`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(POLICY_JSON_WITHOUT_PUBLISH_DATE)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('fails to hit non-existent endpoint with a 404', done => {
      request
        .get(`/foobar`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .expect(404)
        .end(err => {
          done(err)
        })
    })

    it('creates one current policy', done => {
      const policy = POLICY_JSON_WITHOUT_PUBLISH_DATE
      request
        .post(`/policies`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(201)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.value(result.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('verifies cannot POST duplicate policy', done => {
      const policy = POLICY_JSON_WITHOUT_PUBLISH_DATE
      request
        .post(`/policies`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(409)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot PUT invalid policy', async () => {
      const bad_policy_json: Policy = clone(POLICY_JSON_WITHOUT_PUBLISH_DATE)
      delete bad_policy_json.rules[0].rule_type
      const bad_policy = bad_policy_json
      await request
        .put(`/policies/${POLICY_UUID}`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(bad_policy)
        .expect(400)
    })

    it('edits one current policy', async () => {
      const policy = clone(POLICY_JSON_WITHOUT_PUBLISH_DATE)
      policy.name = 'a shiny new name'
      const apiResult = await request
        .put(`/policies/${POLICY_UUID}`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(200)

      test.value(apiResult.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)

      const [result] = await db.readPolicies({
        policy_id: policy.policy_id,
        get_unpublished: true,
        get_published: null
      })
      test.value(result.name).is('a shiny new name')
    })

    it('creates one past policy', done => {
      const policy2 = POLICY2_JSON
      request
        .post(`/policies`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy2)
        .expect(201)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.value(result.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('creates one future new policy', done => {
      // TODO guts
      const policy3 = POLICY3_JSON
      request
        .post(`/policies`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy3)
        .expect(201)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.value(result.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
          done(err)
        })
    })

    it('verifies cannot publish a policy (no auth)', done => {
      request
        .post(`/policies/${POLICY_JSON_WITHOUT_PUBLISH_DATE.policy_id}/publish`)
        .set('Authorization', EMPTY_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('verifies cannot publish a policy (wrong auth)', done => {
      request
        .post(`/policies/${POLICY_JSON_WITHOUT_PUBLISH_DATE.policy_id}/publish`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('verifies cannot publish a policy with missing geographies', done => {
      request
        .post(`/policies/${POLICY_JSON_WITHOUT_PUBLISH_DATE.policy_id}/publish`)
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot publish a policy that was never POSTed', done => {
      request
        .post(`/policies/${GEOGRAPHY_UUID}/publish`)
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot publish a policy if the geo is not published', async () => {
      await db.writeGeography({ name: 'LA', geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY })
      const result = await request
        .post(`/policies/${POLICY_JSON_WITHOUT_PUBLISH_DATE.policy_id}/publish`)
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(424)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('can publish a policy if the geo is published', async () => {
      await db.publishGeography({ geography_id: GEOGRAPHY_UUID })
      const result = await request
        .post(`/policies/${POLICY_JSON_WITHOUT_PUBLISH_DATE.policy_id}/publish`)
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(200)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('cannot double-publish a policy', done => {
      request
        .post(`/policies/${POLICY_JSON_WITHOUT_PUBLISH_DATE.policy_id}/publish`)
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(409)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot edit a published policy (no auth)', done => {
      const policy = clone(POLICY_JSON_WITHOUT_PUBLISH_DATE)
      policy.name = 'an even shinier new name'
      request
        .put(`/policies/${POLICY_JSON_WITHOUT_PUBLISH_DATE.policy_id}`)
        .set('Authorization', EMPTY_SCOPE)
        .send(policy)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot edit a published policy (wrong auth)', done => {
      const policy = clone(POLICY_JSON_WITHOUT_PUBLISH_DATE)
      policy.name = 'an even shinier new name'
      request
        .put(`/policies/${POLICY_JSON_WITHOUT_PUBLISH_DATE.policy_id}`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .send(policy)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot edit a published policy', done => {
      const policy = clone(POLICY_JSON_WITHOUT_PUBLISH_DATE)
      policy.name = 'an even shinier new name'
      request
        .put(`/policies/${POLICY_JSON_WITHOUT_PUBLISH_DATE.policy_id}`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(409)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot delete an unpublished policy (no auth)', done => {
      request
        .delete(`/policies/${POLICY2_UUID}`)
        .set('Authorization', EMPTY_SCOPE)
        .expect(403)
        .end(async err => {
          done(err)
        })
    })

    it('cannot delete an unpublished policy (wrong auth)', done => {
      request
        .delete(`/policies/${POLICY2_UUID}`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(403)
        .end(async err => {
          done(err)
        })
    })

    it('can delete an unpublished policy', done => {
      request
        .delete(`/policies/${POLICY2_UUID}`)
        .set('Authorization', POLICIES_DELETE_SCOPE)
        .expect(200)
        .end(async (err, result) => {
          const body = result.body
          log('read back nonexistent policy response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
          test.value(result.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
          await db
            .readPolicies({ policy_id: POLICY2_UUID, get_published: null, get_unpublished: null })
            .should.be.fulfilledWith([])
          done(err)
        })
    })

    it('cannot delete a published policy', done => {
      request
        .delete(`/policies/${POLICY_UUID}`)
        .set('Authorization', POLICIES_DELETE_SCOPE)
        .expect(404)
        .end(err => {
          done(err)
        })
    })

    it('cannot publish a policy if the start_date would precede the publish_date', async () => {
      await db.writePolicy(POLICY2_JSON)
      const result = await request
        .post(`/policies/${POLICY2_JSON.policy_id}/publish`)
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(409)
      test.value(result.body.error.reason, 'Policies cannot be published after their start_date')
    })

    it('cannot GET policy metadata (no entries exist)', done => {
      request
        .get(`/policies/meta`)
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(404)
        .end(err => {
          done(err)
        })
    })

    it('cannot PUTing policy metadata to create (no auth)', async () => {
      const metadata = { some_arbitrary_thing: 'boop' }
      await request
        .put(`/policies/${POLICY_UUID}/meta`)
        .set('Authorization', EMPTY_SCOPE)
        .send({ policy_id: POLICY_UUID, policy_metadata: metadata })
        .expect(403)
    })

    it('cannot PUTing policy metadata to create (wrong auth)', async () => {
      const metadata = { some_arbitrary_thing: 'boop' }
      await request
        .put(`/policies/${POLICY_UUID}/meta`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .send({ policy_id: POLICY_UUID, policy_metadata: metadata })
        .expect(403)
    })

    it('verifies PUTing policy metadata to create', async () => {
      const metadata = { some_arbitrary_thing: 'boop' }
      const apiResult = await request
        .put(`/policies/${POLICY_UUID}/meta`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send({ policy_id: POLICY_UUID, policy_metadata: metadata })
        .expect(201)
      test.value(apiResult.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
      const result = await db.readSinglePolicyMetadata(POLICY_UUID)
      test.assert(result.policy_metadata.some_arbitrary_thing === 'boop')
    })

    it('verifies PUTing policy metadata to edit', async () => {
      const metadata = { some_arbitrary_thing: 'beep' }
      const apiResult = await request
        .put(`/policies/${POLICY_UUID}/meta`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send({ policy_id: POLICY_UUID, policy_metadata: metadata })
        .expect(200)
      test.value(apiResult.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
      const result = await db.readSinglePolicyMetadata(POLICY_UUID)
      test.assert(result.policy_metadata.some_arbitrary_thing === 'beep')
    })

    it('cannot GET policy metadata (no auth)', done => {
      request
        .get(`/policies/${POLICY_UUID}/meta`)
        .set('Authorization', EMPTY_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot GET policy metadata (wrong auth)', done => {
      request
        .get(`/policies/${POLICY_UUID}/meta`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('verifies GETing policy metadata when given a policy_id', done => {
      request
        .get(`/policies/${POLICY_UUID}/meta`)
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(200)
        .end((err, result) => {
          test.value(result.body.data.policy_metadata.some_arbitrary_thing, 'beep')
          test.value(result.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot GET non-uuid policy_id metadata', done => {
      request
        .get(`/policies/beepbapboop/meta`)
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(400)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot GET non-existent policy metadata', done => {
      request
        .get(`/policies/${uuid()}/meta`)
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot GET policy metadata (no auth)', async () => {
      await request.get(`/policies/meta`).set('Authorization', EMPTY_SCOPE).expect(403)
    })

    it('cannot GET policy metadata (wrong auth)', async () => {
      await request.get(`/policies/meta`).set('Authorization', EVENTS_READ_SCOPE).expect(403)
    })

    it('cannot GET policy metadata with both get_published and get_unpublished set to true', async () => {
      await request
        .get(`/policies/meta?get_published=true&get_unpublished=true`)
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(400)
    })

    it('verifies GETting policy metadata with the same params as for bulk policy reads', async () => {
      const result = await request.get(`/policies/meta`).set('Authorization', POLICIES_READ_SCOPE).expect(200)
      test.assert(result.body.data.policy_metadata.length === 1)
      test.value(result.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('generates a UUID for a policy that has no UUID', done => {
      request
        .post(`/policies`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(POLICY_JSON_MISSING_POLICY_ID)
        .expect(201)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.value(result.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
          test.assert(isUUID(result.body.data.policy.policy_id))
          done(err)
        })
    })

    it('Cannot PUT a policy with publish_date set', done => {
      request
        .put(`/policies/${PUBLISHED_POLICY.policy_id}`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(PUBLISHED_POLICY)
        .expect(400)
        .end((err, result) => {
          test.assert(result.body.error.name === `ValidationError`)
          test.assert(result.body.error.reason.includes('publish_date'))
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('Cannot POST a policy with publish_date set', done => {
      request
        .post(`/policies`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(PUBLISHED_POLICY)
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
