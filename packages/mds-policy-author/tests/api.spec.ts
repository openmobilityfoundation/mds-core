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
import { now, days, clone } from '@mds-core/mds-utils'
import { Policy } from '@mds-core/mds-types'
import { ApiServer } from '@mds-core/mds-api-server'
import { TEST1_PROVIDER_ID, TEST3_PROVIDER_ID } from '@mds-core/mds-providers'

import {
  POLICY_JSON,
  POLICY2_JSON,
  POLICY3_JSON,
  POLICY4_JSON,
  SUPERSEDING_POLICY_JSON,
  POLICY_UUID,
  POLICY2_UUID,
  GEOGRAPHY_UUID,
  GEOGRAPHY2_UUID,
  LA_CITY_BOUNDARY,
  DISTRICT_SEVEN
} from '@mds-core/mds-test-data'
import { api } from '../api'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(ApiServer(api))

const APP_JSON = 'application/json; charset=utf-8'

// TODO
// change the auth token/authing system so it uses agency_id instead of provider_id
const AUTH_NON_PROVIDER = `basic ${Buffer.from(`'BOGUS_PROVIDER_ID_TO_BE_REPLACED'`).toString('base64')}`
const AUTH_PROVIDER_ONLY = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}`).toString('base64')}`
const AUTH_BAD_PROVIDER_ONLY = `basic ${Buffer.from(`${TEST3_PROVIDER_ID}`).toString('base64')}`

describe('Tests app', () => {
  describe('Policy tests', () => {
    before(async () => {
      await db.initialize()
    })

    after(async () => {
      await db.shutdown()
    })

    it('does not authenticate a provider who is not approved', done => {
      const policy = POLICY_JSON
      request
        .post(`/policies`)
        .set('Authorization', AUTH_BAD_PROVIDER_ONLY)
        .send(policy)
        .expect(401)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('does not authenticate a provider_id that is invalid', done => {
      const policy = POLICY_JSON
      request
        .post(`/policies`)
        .set('Authorization', AUTH_NON_PROVIDER)
        .send(policy)
        .expect(400)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('tries to post invalid policy', done => {
      const bad_policy_json: Policy = clone(POLICY_JSON)
      delete bad_policy_json.rules[0].rule_type
      const bad_policy = bad_policy_json
      request
        .post(`/policies`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
      const policy = clone(POLICY_JSON)
      request
        .put(`/policies/d2e31798-f22f-4034-ad36-1f88621b276a`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .send(policy)
        .expect(201)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot POST duplicate policy', done => {
      const policy = POLICY_JSON
      request
        .post(`/policies`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .send(bad_policy)
        .expect(400)
    })

    it('edits one current policy', async () => {
      const policy = clone(POLICY_JSON)
      policy.name = 'a shiny new name'
      await request
        .put(`/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .send(policy)
        .expect(200)

      const [result] = await db.readPolicies({ policy_id: policy.policy_id, get_unpublished: true })
      test.value(result.name).is('a shiny new name')
    })

    it('creates one past policy', done => {
      const policy2 = POLICY2_JSON
      request
        .post(`/policies`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .send(policy2)
        .expect(201)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('creates one future new policy', done => {
      // TODO guts
      const policy3 = POLICY3_JSON
      request
        .post(`/policies`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .send(policy3)
        .expect(201)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot publish a policy with missing geographies', done => {
      request
        .post(`/policies/${POLICY_JSON.policy_id}/publish`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot publish a policy that was never POSTed', done => {
      request
        .post(`/policies/${GEOGRAPHY_UUID}/publish`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(404)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('creates one current geography', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY }
      request
        .post(`/geographies`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
        .post(`/policies/${POLICY_JSON.policy_id}/publish`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('cannot double-publish a policy', done => {
      request
        .post(`/policies/${POLICY_JSON.policy_id}/publish`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
        .put(`/policies/${POLICY_JSON.policy_id}`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .send(policy)
        .expect(409)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('can delete an unpublished policy', done => {
      request
        .delete(`/policies/${POLICY2_UUID}`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
        .delete(`/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(404)
        .end(err => {
          done(err)
        })
    })

    it('verifies PUTing policy metadata', done => {
      const metadata = { some_arbitrary_thing: 'boop' }
      request
        .put(`/policies/${POLICY_UUID}/meta`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .send({ policy_id: POLICY_UUID, policy_metadata: metadata })
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies GETing policy metadata when given a policy_id', done => {
      request
        .get(`/policies/${POLICY_UUID}/meta`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(200)
        .end((err, result) => {
          test.assert(result.body.policy_metadata.some_arbitrary_thing === 'boop')
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot GET non-existent policy metadata', done => {
      request
        .get(`/policies/beepbapboop/meta`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(404)
        .end((err, result) => {
          test.assert(result.body.result === 'not found')
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies GETting policy metadata with the same params as for bulk policy reads', async () => {
      const result = await request
        .get(`/policies/meta?start_date=${now() - days(365)}`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(200)
      test.assert(result.body.length === 1)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('can GET a single policy', done => {
      request
        .get(`/policies/${POLICY_UUID}`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(200)
        .end(async (err, result) => {
          test.assert(result.body.policy_id === POLICY_UUID)
          test.assert(result.body.description === POLICY_JSON.description)
          done(err)
        })
    })

    it('cannot GET a single nonexistent policy', done => {
      request
        .get(`/policies/544d36c4-29f5-4088-a52f-7c9a64d5874c`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(404)
        .end(async err => {
          done(err)
        })
    })
    /*
  it('read back one geography', async () => {
    await db.writeGeography({ geography_id: GEOGRAPHY_UUID, geography_json: la_city_boundary })
    request
      .get(`/geographies/${GEOGRAPHY_UUID}`)
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        const body = result.body
        log('read back one geo response:', body)
        test.value(result).hasHeader('content-type', APP_JSON)
        // TODO verify contents
        return err
      })
  })
  */

    it('can GET all active policies', async () => {
      await db.writeGeography({ geography_id: GEOGRAPHY2_UUID, geography_json: DISTRICT_SEVEN })
      await db.writePolicy(POLICY4_JSON)
      await db.writePolicy(SUPERSEDING_POLICY_JSON)
      await db.publishPolicy(SUPERSEDING_POLICY_JSON.policy_id)
      request
        .get(`/policies?start_date=${now() - days(365)}`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(200)
        .end(async (policies_err, policies_result) => {
          test.assert(policies_result.body.policies.length === 4)
          return policies_err
        })
    })

    it('can GET all published policies', done => {
      request
        .get(`/policies?start_date=${now() - days(365)}&get_published=true`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(200)
        .end(async (policies_err, policies_result) => {
          test.assert(policies_result.body.policies.length === 2)
          done(policies_err)
        })
    })

    it('can GET all unpublished policies', done => {
      request
        .get(`/policies?start_date=${now() - days(365)}&get_unpublished=true`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(200)
        .end(async (policies_err, policies_result) => {
          test.assert(policies_result.body.policies.length === 2)
          done(policies_err)
        })
    })

    it('throws an exception if both get_unpublished and get_published are submitted', done => {
      request
        .get(`/policies?start_date=${now() - days(365)}&get_unpublished=true&get_published=true`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(400)
        .end(async policies_err => {
          done(policies_err)
        })
    })
  })

  describe('Geography endpoint tests', () => {
    before(async () => {
      await db.initialize()
    })

    after(async () => {
      await db.shutdown()
    })

    it('creates one current geography', done => {
      const geography = { geography_id: GEOGRAPHY_UUID, geography_json: LA_CITY_BOUNDARY }
      request
        .post(`/geographies`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
        .get(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
        .put(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .send(geography)
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies PUTing geography metadata', done => {
      const metadata = { some_arbitrary_thing: 'boop' }
      request
        .put(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .send({ geography_id: GEOGRAPHY_UUID, geography_metadata: metadata })
        .expect(200)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies GETing geography metadata', done => {
      request
        .get(`/geographies/${GEOGRAPHY_UUID}/meta`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(200)
        .end((err, result) => {
          test.assert(result.body.geography_metadata.some_arbitrary_thing === 'boop')
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('verifies cannot GET non-existent geography metadata', done => {
      request
        .get(`/geographies/beepbapboop/meta`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
        .put(`/geographies/${GEOGRAPHY_UUID}`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
        .put(`/geographies/${POLICY_UUID}`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
        .post(`/geographies`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
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
        .post(`/geographies`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .send(geography)
        .expect(409)
        .end((err, result) => {
          test.value(result).hasHeader('content-type', APP_JSON)
          done(err)
        })
    })

    it('can do bulk geography metadata reads', async () => {
      await db.writeGeography({ geography_id: GEOGRAPHY2_UUID, geography_json: DISTRICT_SEVEN })
      await db.writeGeographyMetadata({ geography_id: GEOGRAPHY2_UUID, geography_metadata: { earth: 'isround' } })

      const result = await request
        .get(`/geographies/meta?get_read_only=false`)
        .set('Authorization', AUTH_PROVIDER_ONLY)
        .expect(200)
      test.assert(result.body.length === 2)
      test.value(result).hasHeader('content-type', APP_JSON)
    })
  })
})
