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
import sinon from 'sinon'
import test from 'unit.js'
import { now, clone, days } from '@mds-core/mds-utils'
import { Policy } from '@mds-core/mds-types'
import { ApiServer } from '@mds-core/mds-api-server'
import { TEST1_PROVIDER_ID } from '@mds-core/mds-providers'
import db from '@mds-core/mds-db'
import {
  POLICY_JSON,
  POLICY2_JSON,
  POLICY3_JSON,
  SUPERSEDING_POLICY_JSON,
  POLICY_UUID,
  POLICY2_UUID,
  GEOGRAPHY_UUID,
  PROVIDER_SCOPES,
  LA_CITY_BOUNDARY,
  DISTRICT_SEVEN
} from '@mds-core/mds-test-data'
import { START_ONE_MONTH_AGO, START_ONE_WEEK_AGO, START_ONE_YEAR_AGO } from 'packages/mds-test-data/dist'
import { api } from '../api'

process.env.PATH_PREFIX = '/policy'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(ApiServer(api))

const APP_JSON = 'application/json; charset=utf-8'

// TODO
// change the auth token/authing system so it uses agency_id instead of provider_id
const AUTH_NON_PROVIDER = `basic ${Buffer.from(`'BOGUS_PROVIDER_ID_TO_BE_REPLACED'|${PROVIDER_SCOPES}`).toString(
  'base64'
)}`
const AUTH_ADMIN_ONLY = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}|${'admin:all'}`).toString('base64')}`

describe('Tests app', () => {
  describe('Test basic housekeeping', () => {
    it('resets the db', done => {
      request
        .get('/test/initialize')
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies unable to access test if not scoped', done => {
      request
        .get('/test/')
        .set('Authorization', AUTH_ADMIN_ONLY)
        .expect(403)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          test.string(result.body.result).contains('no test access without test:all scope')
          done(err)
        })
    })

    it('shuts things down', done => {
      request
        .get('/test/shutdown')
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })
  })

  describe('Policy tests', () => {
    before(done => {
      request
        .get('/test/initialize')
        .set('Authorization', AUTH_NON_PROVIDER)
        .end(err => {
          done(err)
        })
    })

    after(done => {
      request
        .get('/test/shutdown')
        .set('Authorization', AUTH_NON_PROVIDER)
        .end(err => {
          done(err)
        })
    })

    it('tries to post invalid policy', done => {
      const bad_policy_json: Policy = clone(POLICY_JSON)
      delete bad_policy_json.rules[0].rule_type
      const bad_policy = bad_policy_json
      request
        .post(`/admin/policies`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(bad_policy)
        .expect(400)
        .end((err, result) => {
          const body = result.body
          test.value(body[0].message).contains('rule_type')
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot PUT non-existent policy', done => {
      console.log('cannot put')
      const policy = clone(POLICY_JSON)
      policy.policy_id = 'd2e31798-f22f-4034-ad36-1f88621b276a'
      request
        .put(`/admin/policies/${policy.policy_id}`)
        .set('Authorization', AUTH_ADMIN_ONLY)
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
        .post(`/admin/policies`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(policy)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot POST duplicate policy', done => {
      const policy = POLICY_JSON
      request
        .post(`/admin/policies`)
        .set('Authorization', AUTH_NON_PROVIDER)
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
        .put(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(bad_policy)
        .expect(400)
    })

    it('edits one current policy', async () => {
      const policy = clone(POLICY_JSON)
      policy.name = 'a shiny new name'
      await request
        .put(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(policy)
        .expect(200)

      const [result] = await db.readPolicies({ policy_id: policy.policy_id, get_unpublished: true })
      test.value(result.name).is('a shiny new name')
    })

    it('creates one past policy', done => {
      const policy2 = POLICY2_JSON
      request
        .post(`/admin/policies`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(policy2)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('creates one future new policy', done => {
      // TODO guts
      const policy3 = POLICY3_JSON
      request
        .post(`/admin/policies`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(policy3)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot publish a policy with missing geographies', done => {
      request
        .post(`/admin/policies/${POLICY_JSON.policy_id}/publish`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot publish a policy that was never POSTed', done => {
      request
        .post(`/admin/policies/${GEOGRAPHY_UUID}/publish`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('creates one current geography', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY }
      request
        .post(`/admin/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(geography)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('create one geo response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('can publish a policy', done => {
      request
        .post(`/admin/policies/${POLICY_JSON.policy_id}/publish`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot double-publish a policy', done => {
      request
        .post(`/admin/policies/${POLICY_JSON.policy_id}/publish`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .expect(409)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot edit a published policy', done => {
      const policy = clone(POLICY_JSON)
      policy.name = 'an even shinier new name'
      request
        .put(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .send(policy)
        .expect(409)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('can delete an unpublished policy', done => {
      console.log('can delete an unpublished')
      request
        .delete(`/admin/policies/${POLICY2_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end(async (err, result) => {
          const body = result.body
          log('read back nonexistent policy response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
          await db.readPolicies({ policy_id: POLICY2_UUID }).should.be.fulfilledWith([])
          done(err)
        })
    })

    it('cannot delete a published policy', done => {
      request
        .delete(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(404)
        .end(err => {
          done(err)
        })
    })

    it('verifies POSTing policy metadata', done => {
      const metadata = { some_arbitrary_thing: 'boop' }
      request
        .post(`/admin/policies/meta/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(metadata)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies GETing policy metadata', done => {
      request
        .get(`/admin/policies/meta/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          test.assert(result.body.some_arbitrary_thing === 'boop')
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot GET non-existent policy metadata', done => {
      request
        .get(`/admin/policies/meta/beepbapboop`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(404)
        .end((err, result) => {
          test.assert(result.body.result === 'not found')
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('can GET a single policy', done => {
      request
        .get(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .expect(200)
        .end(async (err, result) => {
          test.assert(result.body.policy_id === POLICY_UUID)
          test.assert(result.body.description === POLICY_JSON.description)
          done(err)
        })
    })

    it('cannot GET a single nonexistent policy', done => {
      request
        .get(`/admin/policies/544d36c4-29f5-4088-a52f-7c9a64d5874c`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .expect(404)
        .end(async err => {
          console.log('cannot get a nonexistent policy', err)
          done(err)
        })
    })

    it('can GET all policies, unpublished, active, or whatever', done => {
      request
        .post(`/admin/policies`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .send(SUPERSEDING_POLICY_JSON)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          request
            .get(`/admin/policies?start_date=${START_ONE_YEAR_AGO - 1}`)
            .set('Authorization', AUTH_ADMIN_ONLY)
            .expect(200)
            .end(async (policies_err, policies_result) => {
              console.log('get all policies test')
              console.log(policies_result.body)
              test.assert(policies_result.body.policies.length === 3)
              done(policies_err)
            })
        })
    })

    it('read back an old policy', done => {
      request
        .get(`/admin/policies?start_date=${START_ONE_MONTH_AGO}&end_date=${START_ONE_WEEK_AGO}`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('read back all policies response:', body)
          test.value(body.policies.length).is(1) // only one
          test.value(body.policies[0].policy_id).is(POLICY2_UUID)
          test.value(result).hasHeader('content-type', APP_JSON)
          // TODO verify contents
          done(err)
        })
    })

    it('read back current and future policies', done => {
      request
        .get(`/admin/policies?end_date=${now() + days(365)}`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('read back all policies response:', body)
          test.value(body.policies.length).is(2) // current and future
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('has the correct error code if it cannot get all policies', done => {
      const stub = sinon.stub(db, 'readPolicies')
      stub.throws()
      request
        .get(`/admin/policies`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .expect(502)
        .end(async err => {
          done(err)
        })
    })
  })

  describe('Geography endpoint tests', () => {
    before(done => {
      request
        .get('/test/initialize')
        .set('Authorization', AUTH_NON_PROVIDER)
        .end(err => {
          done(err)
        })
    })

    after(done => {
      request
        .get('/test/shutdown')
        .set('Authorization', AUTH_NON_PROVIDER)
        .end(err => {
          done(err)
        })
    })

    it('creates one current geography', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY }
      request
        .post(`/admin/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(geography)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('create one geo response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('GETs one current geography', done => {
      request
        .get(`/admin/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          test.assert(result.body.geography.geography_id === GEOGRAPHY_UUID)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies updating one geography', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: DISTRICT_SEVEN }
      request
        .put(`/admin/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(geography)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies POSTing geography metadata', done => {
      const metadata = { some_arbitrary_thing: 'boop' }
      request
        .post(`/admin/geographies/meta/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(metadata)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies GETing geography metadata', done => {
      request
        .get(`/admin/geographies/meta/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          test.assert(result.body.some_arbitrary_thing === 'boop')
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot GET non-existent geography metadata', done => {
      request
        .get(`/admin/geographies/meta/beepbapboop`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(404)
        .end((err, result) => {
          test.assert(result.body.result === 'not found')
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot PUT bad geography', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: 'garbage_json' }
      request
        .put(`/admin/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(geography)
        .expect(400)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot PUT non-existent geography', done => {
      const geography = { geography_id: POLICY_UUID, geography_json: DISTRICT_SEVEN }
      request
        .put(`/admin/geographies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(geography)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot POST invalid geography', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: 'garbage_json' }
      request
        .post(`/admin/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(geography)
        .expect(400)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot POST duplicate geography', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY }
      request
        .post(`/admin/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(geography)
        .expect(409)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })
  })
})
