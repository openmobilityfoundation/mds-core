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

import supertest from 'supertest'
import test from 'unit.js'
import { now, days } from 'mds-utils'
import { Policy } from 'mds'
import { server } from 'mds-api-server'
import { TEST1_PROVIDER_ID } from 'mds-providers'
import { la_city_boundary } from './la-city-boundary'
import { api } from '../api'
import {
  POLICY_JSON,
  POLICY2_JSON,
  POLICY3_JSON,
  POLICY_UUID,
  POLICY2_UUID,
  POLICY3_UUID,
  GEOGRAPHY_UUID,
  START_ONE_MONTH_AGO,
  START_ONE_WEEK_AGO,
} from 'mds-test-data'

process.env.PATH_PREFIX = '/policy'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const PROVIDER_SCOPES = 'admin:all test:all'

const request = supertest(server(api))

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

const APP_JSON = 'application/json; charset=utf-8'

const AUTH = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`

describe('Tests app', () => {
  it('gets the root', done => {
    request
      .get('/')
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('health without provider', done => {
    request
      .get('/health')
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('resets the db', done => {
    log('AUTHing', AUTH)
    request
      .get('/test/initialize')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
  it('reads teh Policy schema', done => {
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

  // MAIN TESTS HERE

  it('creates one current geography', done => {
    const geography = { geography_id: GEOGRAPHY_UUID, geography_json: la_city_boundary }
    request
      .post(`/admin/geographies/${GEOGRAPHY_UUID}`)
      .set('Authorization', AUTH)
      .send(geography)
      .expect(200)
      .end((err, result) => {
        const body = result.body
        log('create one geo response:', body)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('read back one geography', done => {
    request
      .get(`/geographies/${GEOGRAPHY_UUID}`)
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        const body = result.body
        log('read back one geo response:', body)
        test.value(result).hasHeader('content-type', APP_JSON)
        // TODO verify contents
        done(err)
      })
  })

  it('tries to post invalid policy', done => {
    const bad_policy_json: Policy = clone(POLICY_JSON)
    delete bad_policy_json.rules[0].rule_type
    const bad_policy = bad_policy_json
    request
      .post(`/admin/policies/${POLICY_UUID}`)
      .set('Authorization', AUTH)
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
      .set('Authorization', AUTH)
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
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        const body = result.body
        log('read back one policy response:', body)
        test.value(result).hasHeader('content-type', APP_JSON)
        // TODO verify contents
        done(err)
      })
  })

  it('creates one past policy', done => {
    const policy2 = POLICY2_JSON
    request
      .post(`/admin/policies/${POLICY_UUID}`)
      .set('Authorization', AUTH)
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
      .set('Authorization', AUTH)
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
      .set('Authorization', AUTH)
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

  it('read back all policies', done => {
    request
      .get(`/policies?start_date=${now() - days(365)}&end_date=${now() + days(365)}`)
      .set('Authorization', AUTH)
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

  it('read back an old policy', done => {
    request
      .get(`/policies?start_date=${START_ONE_MONTH_AGO}&end_date=${START_ONE_WEEK_AGO}`)
      .set('Authorization', AUTH)
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
      .set('Authorization', AUTH)
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
      .set('Authorization', AUTH)
      .expect(404)
      .end((err, result) => {
        const body = result.body
        log('read back nonexistant policy response:', body)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('read back a nonexistant geography', done => {
    request
      .get(`/geographies/${POLICY_UUID}`) // obvs not a geography
      .set('Authorization', AUTH)
      .expect(404)
      .end((err, result) => {
        const body = result.body
        log('read back nonexistant geography response:', body)
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
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

  it('shuts down the db', done => {
    request
      .get('/test/shutdown')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })
})
