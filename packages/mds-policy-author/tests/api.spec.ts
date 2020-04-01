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
import { clone, isUUID } from '@mds-core/mds-utils'
import { Policy } from '@mds-core/mds-types'
import { ApiServer } from '@mds-core/mds-api-server'
import {
  POLICY_JSON,
  POLICY2_JSON,
  POLICY3_JSON,
  POLICY4_JSON,
  POLICY_JSON_MISSING_POLICY_ID,
  SUPERSEDING_POLICY_JSON,
  POLICY_UUID,
  POLICY2_UUID,
  GEOGRAPHY_UUID,
  GEOGRAPHY2_UUID,
  LA_CITY_BOUNDARY,
  DISTRICT_SEVEN,
  SCOPED_AUTH
} from '@mds-core/mds-test-data'
import { api } from '../api'
import { POLICY_AUTHOR_API_DEFAULT_VERSION } from '../types'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(ApiServer(api))

const APP_JSON = 'application/vnd.mds.policy-author+json; charset=utf-8; version=0.1'
const EMPTY_SCOPE = SCOPED_AUTH([], '')
const EVENTS_READ_SCOPE = SCOPED_AUTH(['events:read'])
const POLICIES_WRITE_SCOPE = SCOPED_AUTH(['policies:write'])
const POLICIES_READ_SCOPE = SCOPED_AUTH(['policies:read'])
const POLICIES_PUBLISH_SCOPE = SCOPED_AUTH(['policies:publish'])
const POLICIES_DELETE_SCOPE = SCOPED_AUTH(['policies:delete'])

describe('Tests app', () => {
  describe('Policy tests', () => {
    before(async () => {
      await db.initialize()
    })

    after(async () => {
      await db.shutdown()
    })

    it('cannot create one current policy (no authorization)', done => {
      const policy = POLICY_JSON
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
      const policy = POLICY_JSON
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
      const bad_policy_json: Policy = clone(POLICY_JSON)
      delete bad_policy_json.rules[0].rule_type
      const bad_policy = bad_policy_json
      request
        .post(`/policies`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(bad_policy)
        .expect(400)
        .end((err, result) => {
          const body = result.body
          test.value(body[0].message).contains('rule_type')
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot PUT policy (no auth)', done => {
      const policy = clone(POLICY_JSON)
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
      const policy = clone(POLICY_JSON)
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
      const policy = clone(POLICY_JSON)
      request
        .put(`/policies/d2e31798-f22f-4034-ad36-1f88621b276a`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('creates one current policy', done => {
      const policy = POLICY_JSON
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
      const policy = POLICY_JSON
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
      const bad_policy_json: Policy = clone(POLICY_JSON)
      delete bad_policy_json.rules[0].rule_type
      const bad_policy = bad_policy_json
      await request
        .put(`/policies/${POLICY_UUID}`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(bad_policy)
        .expect(400)
    })

    it('edits one current policy', async () => {
      const policy = clone(POLICY_JSON)
      policy.name = 'a shiny new name'
      const apiResult = await request
        .put(`/policies/${POLICY_UUID}`)
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(200)

      test.value(apiResult.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)

      const [result] = await db.readPolicies({ policy_id: policy.policy_id, get_unpublished: true })
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
        .post(`/policies/${POLICY_JSON.policy_id}/publish`)
        .set('Authorization', EMPTY_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('verifies cannot publish a policy (wrong auth)', done => {
      request
        .post(`/policies/${POLICY_JSON.policy_id}/publish`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('verifies cannot publish a policy with missing geographies', done => {
      request
        .post(`/policies/${POLICY_JSON.policy_id}/publish`)
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

    it('can publish a policy', async () => {
      await db.writeGeography({ name: 'LA', geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY })
      const result = await request
        .post(`/policies/${POLICY_JSON.policy_id}/publish`)
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(200)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('cannot double-publish a policy', done => {
      request
        .post(`/policies/${POLICY_JSON.policy_id}/publish`)
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(409)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot edit a published policy (no auth)', done => {
      const policy = clone(POLICY_JSON)
      policy.name = 'an even shinier new name'
      request
        .put(`/policies/${POLICY_JSON.policy_id}`)
        .set('Authorization', EMPTY_SCOPE)
        .send(policy)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot edit a published policy (wrong auth)', done => {
      const policy = clone(POLICY_JSON)
      policy.name = 'an even shinier new name'
      request
        .put(`/policies/${POLICY_JSON.policy_id}`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .send(policy)
        .expect(403)
        .end(err => {
          done(err)
        })
    })

    it('cannot edit a published policy', done => {
      const policy = clone(POLICY_JSON)
      policy.name = 'an even shinier new name'
      request
        .put(`/policies/${POLICY_JSON.policy_id}`)
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
          await db.readPolicies({ policy_id: POLICY2_UUID }).should.be.fulfilledWith([])
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
          test.value(result.body.policy_metadata.some_arbitrary_thing, 'beep')
          test.value(result.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot GET non-existent policy metadata', done => {
      request
        .get(`/policies/beepbapboop/meta`)
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(404)
        .end((err, result) => {
          test.assert(result.body.result === 'not found')
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

    it('verifies GETting policy metadata with the same params as for bulk policy reads', async () => {
      const result = await request.get(`/policies/meta`).set('Authorization', POLICIES_READ_SCOPE).expect(200)
      test.assert(result.body.policy_metadata.length === 1)
      test.value(result.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('cannot GET a single policy (no auth)', done => {
      request
        .get(`/policies/${POLICY_UUID}`)
        .set('Authorization', EMPTY_SCOPE)
        .expect(403)
        .end(async err => {
          done(err)
        })
    })

    it('cannot GET a single policy (wrong auth)', done => {
      request
        .get(`/policies/${POLICY_UUID}`)
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(403)
        .end(async err => {
          done(err)
        })
    })

    it('can GET a single policy', async () => {
      const result = await request.get(`/policies/${POLICY_UUID}`).set('Authorization', POLICIES_READ_SCOPE)
      test.assert(result.body.policy.policy_id === POLICY_UUID)
      test.assert(result.body.policy.description === POLICY_JSON.description)
      test.value(result.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
    })

    it('cannot GET a single nonexistent policy', done => {
      request
        .get(`/policies/544d36c4-29f5-4088-a52f-7c9a64d5874c`)
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(404)
        .end(async err => {
          done(err)
        })
    })

    it('cannot GET all active policies (no auth)', async () => {
      await request.get(`/policies`).set('Authorization', EMPTY_SCOPE).expect(403)
    })

    it('cannot GET all active policies (wrong auth)', async () => {
      await request.get(`/policies`).set('Authorization', EVENTS_READ_SCOPE).expect(403)
    })

    it('can GET all active policies', async () => {
      await db.writeGeography({ name: 'Geography 2', geography_id: GEOGRAPHY2_UUID, geography_json: DISTRICT_SEVEN })
      await db.writePolicy(POLICY4_JSON)
      await db.writePolicy(SUPERSEDING_POLICY_JSON)
      await db.publishPolicy(SUPERSEDING_POLICY_JSON.policy_id)
      request
        .get(`/policies`)
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(200)
        .end(async (policies_err, policies_result) => {
          test.assert(policies_result.body.length === 4)
          return policies_err
        })
    })

    // This test has been replaced by a less flaky unit test
    // TODO re-evaluate integration test strategy
    // it('can GET all published policies', done => {
    //   request
    //     .get(`/policies?get_published=true`)
    //     .set('Authorization', POLICIES_READ_SCOPE)
    //     .expect(200)
    //     .end(async (policies_err, policies_result) => {
    //       test.assert(policies_result.body.length === 2)
    //       done(policies_err)
    //     })
    // })

    it('throws an exception if both get_unpublished and get_published are submitted', done => {
      request
        .get(`/policies?get_unpublished=true&get_published=true`)
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(400)
        .end(async policies_err => {
          done(policies_err)
        })
    })

    it('can GET all unpublished policies', async () => {
      const result = await request
        .get(`/policies?get_unpublished=true`)
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(200)
      test.assert(result.body.policies.length === 2)
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
          test.assert(isUUID(result.body.policy.policy_id))
          done(err)
        })
    })
  })
})
