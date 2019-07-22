/* eslint-disable promise/prefer-await-to-callbacks */
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

import supertest from 'supertest'
import test from 'unit.js'
import { VEHICLE_TYPES, Policy } from 'mds-types'
import { now, days } from 'mds-utils'
import { server } from 'mds-api-server'
import { TEST1_PROVIDER_ID } from 'mds-providers'
import { la_city_boundary } from './la-city-boundary'
import { api } from '../api'

process.env.PATH_PREFIX = '/policy'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const GEOGRAPHY_UUID = '8917cf2d-a963-4ea2-a98b-7725050b3ec5'
const GEOGRAPHY2_UUID = '722b99ca-65c2-4ed6-9be1-056c394fadbf'

const POLICY_UUID = '72971a3d-876c-41ea-8e48-c9bb965bbbcc'
const POLICY2_UUID = '5681364c-2ebf-4ba2-9ca0-50f4be2a5876'
const POLICY3_UUID = '42d899b8-255d-4109-aa67-abfb9157b46a'

const PROVIDER_SCOPES = 'admin:all test:all'

const request = supertest(server(api))

const start_yesterday = now() - (now() % days(1))

const policy_json: Policy = {
  // TODO guts
  name: 'LADOT Mobility Caps',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: POLICY_UUID,
  start_date: start_yesterday,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      rule_type: 'count',
      rule_id: '7ea0d16e-ad15-4337-9722-9924e3af9146',
      name: 'Greater LA',
      geographies: [GEOGRAPHY_UUID],
      statuses: { available: [], unavailable: [], reserved: [], trip: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      maximum: 3000,
      minimum: 500
    }
  ]
}

const start_one_month_ago = now() - (now() % days(1)) - days(30)
const start_one_week_ago = now() - (now() % days(1)) - days(7)

// in the past
const policy2_json: Policy = {
  // TODO guts
  name: 'Idle Times',
  description: 'LADOT Idle Time Limitations',
  policy_id: POLICY2_UUID,
  start_date: start_one_month_ago,
  end_date: start_one_week_ago,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA (rentable)',
      rule_id: '2df37be2-b1cb-4152-9bb9-b23472a43b05',
      rule_type: 'time',
      rule_units: 'minutes',
      geographies: [GEOGRAPHY_UUID],
      statuses: { available: [], reserved: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      maximum: 7200
    },
    {
      name: 'Greater LA (non-rentable)',
      rule_id: '06a97976-180d-4990-b497-ecafbe818d7d',
      rule_type: 'time',
      rule_units: 'minutes',
      geographies: [GEOGRAPHY_UUID],
      statuses: { unavailable: [], trip: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      maximum: 720
    }
  ]
}

const start_one_month_from_now = now() - (now() % days(1)) + days(30)

// in the future
const policy3_json: Policy = {
  // TODO guts
  policy_id: POLICY3_UUID,
  name: 'Speed Limits',
  description: 'LADOT Pilot Speed Limit Limitations',
  start_date: start_one_month_from_now,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA',
      rule_id: 'bfd790d3-87d6-41ec-afa0-98fa443ee0d3',
      rule_type: 'speed',
      rule_units: 'mph',
      geographies: [GEOGRAPHY_UUID],
      statuses: { trip: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      maximum: 15
    },
    {
      name: 'Venice Beach on weekend afternoons',
      geographies: [GEOGRAPHY2_UUID],
      rule_id: 'dff14dd1-603e-43d1-b0cf-5d4fe21d8628',
      rule_type: 'speed',
      rule_units: 'mph',
      statuses: { trip: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      days: ['sat', 'sun'],
      start_time: '12:00',
      end_time: '23:59',
      maximum: 10,
      messages: {
        'en-US': 'Remember to stay under 10 MPH on Venice Beach on weekends!',
        'es-US': '¡Recuerda permanecer menos de 10 millas por hora en Venice Beach los fines de semana!'
      }
    }
  ]
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

const APP_JSON = 'application/json; charset=utf-8'

const AUTH = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`

describe('Tests app', () => {
  it('resets the db', done => {
    request
      .get('/test/initialize')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        done(err)
      })
  })

  it('verifies no test access without scope', done => {
    request
      .get('/test/initialize')
      .expect(403)
      .end(() => {
        done()
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
    const bad_policy_json: Policy = clone(policy_json)
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

  it('tries to get policy for invalid dates', done => {
    request
      .get('/policies?start_date=100000&end_date=100')
      .set('Authorization', AUTH)
      .expect(400)
      .end((err, result) => {
        test.value(result.body.result === 'start_date after end_date')
        done(err)
      })
  })

  it('tries to read non-existant policy', done => {
    request
      .get('/policies/notarealgeography')
      .set('Authorization', AUTH)
      .expect(404)
      .end((err, result) => {
        test.value(result.body.result === 'not found')
        done(err)
      })
  })

  it('tries to read non-existant geography', done => {
    request
      .get('/geographies/notarealgeography')
      .set('Authorization', AUTH)
      .expect(404)
      .end((err, result) => {
        test.value(result.body.result === 'not found')
        done(err)
      })
  })

  it('creates one current policy', done => {
    const policy = policy_json
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
    const policy2 = policy2_json
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
    const policy3 = policy3_json
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
      .get(`/policies?start_date=${start_one_month_ago}&end_date=${start_one_week_ago}`)
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
