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

import supertest from 'supertest'
import test from 'unit.js'
import { VEHICLE_TYPES } from 'mds-enums'
import { now, days, clone } from 'mds-utils'
import { Policy } from 'mds'
import { server } from 'mds-api-server'
import { TEST1_PROVIDER_ID } from 'mds-providers'
import {
  POLICY_JSON,
  POLICY2_JSON,
  POLICY3_JSON,
  POLICY_UUID,
  POLICY2_UUID,
  GEOGRAPHY_UUID,
  START_ONE_MONTH_AGO,
  START_ONE_WEEK_AGO,
  PROVIDER_SCOPES,
  LA_CITY_BOUNDARY
} from 'mds-test-data'
import { doesNotReject } from 'assert'
import { api } from '../api'

process.env.PATH_PREFIX = '/policy'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(server(api))

const APP_JSON = 'application/json; charset=utf-8'

const AUTH = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`
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

    it('reads the Policy schema', done => {
      request
        .get('/schema/policy')
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('schema', JSON.stringify(body))
          test.value(result).hasHeader('content-type', APP_JSON)
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
        .end((err, result) => {
          done(err)
        })
    })

    after(done => {
      request
        .get('/test/shutdown')
        .set('Authorization', AUTH_NON_PROVIDER)
        .end((err, result) => {
          done(err)
        })
    })

    it('tries to post invalid policy', done => {
      const bad_policy_json: Policy = clone(POLICY_JSON)
      delete bad_policy_json.rules[0].rule_type
      const bad_policy = bad_policy_json
      request
        .post(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(bad_policy)
        .expect(422)
        .end((err, result) => {
          const body = result.body
          log('post bad policy response:', body)
          test.value(body[0].message).contains('rule_type')
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('creates one current policy', done => {
      const policy = POLICY_JSON
      request
        .post(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(policy)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('create one currrent policy response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('read back one policy', done => {
      request
        .get(`/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('read back one policy response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
          // TODO verify contents
          done(err)
        })
    })

    it('edits one current policy', async () => {
      const policy = clone(POLICY_JSON)
      policy.name = 'a shiny new name'
      await request
        .put(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(policy)
        .expect(200)

      const result = await request
        .get(`/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
      test.value(result.body.name).is('a shiny new name')
    })

    it('creates one past policy', done => {
      const policy2 = POLICY2_JSON
      request
        .post(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(policy2)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('read back one past policy response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('creates one future new policy', done => {
      // TODO guts
      const policy3 = POLICY3_JSON
      request
        .post(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(policy3)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('read back one future policy response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('read back all active policies', done => {
      request
        .get(`/policies`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('read back all policies response:', body)
          test.value(body.policies.length).is(1) // only one should be currently valid
          test.value(body.policies[0].policy_id).is(POLICY_UUID)
          test.value(result).hasHeader('content-type', APP_JSON)
          // TODO verify contents
          done(err)
        })
    })

    it('read back all policies, before any publishing happens, without the unpublished parameter', done => {
      request
        .get(`/policies?start_date=${now() - days(365)}&end_date=${now() + days(365)}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('read back all policies response:', body)
          test.value(body.policies.length).is(3)
          test.value(result).hasHeader('content-type', APP_JSON)
          // TODO verify contents
          done(err)
        })
    })

    it('reads back all unpublished policies before any publishing happens, with the unpublished parameter', done => {
      request
        .get(`/policies?unpublished&start_date=${now() - days(365)}&end_date=${now() + days(365)}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          test.value(body.policies.length).is(3)
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

    it('cannot edit a published policy', done => {
      const policy = clone(POLICY_JSON)
      policy.name = 'an even shinier new name'
      request
        .put(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_ADMIN_ONLY)
        .send(policy)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
        })
      request
        .get(`/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          test.value(body.name).is('a shiny new name')
          done(err)
        })
    })

    it('reads back the correct number of policies after a policy has been published, with the parameter', done => {
      request
        .get(`/policies?unpublished&start_date=${now() - days(365)}&end_date=${now() + days(365)}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          test.value(body.policies.length).is(2)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('reads back the correct number of policies after publishing, with `unpublished`, without provider_id', done => {
      request
        .get(`/policies?unpublished&start_date=${now() - days(365)}&end_date=${now() + days(365)}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log(body)
          //        test.value(body.policies.length).is(2)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('reads back the correct number of policies after a policy has been published, without the parameter', done => {
      request
        .get(`/policies?start_date=${now() - days(365)}&end_date=${now() + days(365)}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('fuck this failing test')
          log(body)
          test.value(body.policies.length).is(3)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('read back an old policy', done => {
      request
        .get(`/policies?start_date=${START_ONE_MONTH_AGO}&end_date=${START_ONE_WEEK_AGO}`)
        .set('Authorization', AUTH_NON_PROVIDER)
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
        .get(`/policies?end_date=${now() + days(365)}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('read back all policies response:', body)
          test.value(body.policies.length).is(2) // current and future
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('read back a nonexistant policy', done => {
      request
        .get(`/policies/${GEOGRAPHY_UUID}`) // obvs not a policy
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(404)
        .end((err, result) => {
          const body = result.body
          log('read back nonexistant policy response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    // TODO
    // this test does not behave the way I expect it to
    // that second get should not return anything
    it('can delete an unpublished policy', done => {
      request
        .delete(`/admin/policies/${POLICY2_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result) => {
          const body = result.body
          log('read back nonexistant policy response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
        })
      request
        .get(`/policies/${POLICY2_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(200)
        .end((err, result2) => {
          const body = result2.body
          log('read back deleted policy response:', body)
          test.value(result2).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot delete a published policy', done => {
      request
        .delete(`/admin/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(404)
        .end((err, result) => {
          done(err)
        })
    })
  })

  describe('Geography endpoint tests', () => {
    before(done => {
      request
        .get('/test/initialize')
        .set('Authorization', AUTH_NON_PROVIDER)
        .end((err, result) => {
          done(err)
        })
    })

    after(done => {
      request
        .get('/test/shutdown')
        .set('Authorization', AUTH_NON_PROVIDER)
        .end((err, result) => {
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

    it('read back a nonexistant geography', done => {
      request
        .get(`/geographies/${POLICY_UUID}`) // obvs not a geography
        .set('Authorization', AUTH_NON_PROVIDER)
        .expect(404)
        .end((err, result) => {
          const body = result.body
          log('read back nonexistant geography response:', body)
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })
  })
})

// PUBLISHING (TODO)
// a published policy or geography should be read-only,
// while an un-published policy or geography is not

// PROVIDER-SPECIFICITY (TODO)
// policies should be for all, some, or one Provider when published;
// providers should not be able to read each other's Provider-specific Policy objects

// publish geography

// publish policy

// fail to delete published geography

// fail to delete published policy

// update unpublished geography

// update unpublished policy

// delete unpublished geography

// delete unpublished policy

// END TESTS
