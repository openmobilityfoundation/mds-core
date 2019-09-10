/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable promise/prefer-await-to-callbacks */
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
import { now, days } from '@mds-core/mds-utils'
import { ApiServer } from '@mds-core/mds-api-server'
import { TEST1_PROVIDER_ID } from '@mds-core/mds-providers'
import db from '@mds-core/mds-db'
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
  GEOGRAPHY2_UUID
} from '@mds-core/mds-test-data'
import { la_city_boundary } from './la-city-boundary'
import { api } from '../api'
/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const veniceSpecialOpsZone = require('../../ladot-service-areas/venice-special-ops-zone')

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(ApiServer(api))

const APP_JSON = 'application/json; charset=utf-8'

const AUTH = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`

describe('Tests app', () => {
  before('Initialize the DB', async () => {
    await db.initialize()
  })

  after('Shutdown the DB', async () => {
    await db.shutdown()
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

  // MAIN TESTS HERE

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
      .expect(400)
      .end((err, result) => {
        test.value(result.body.result === 'not found')
        done(err)
      })
  })

  it('tries to read non-existant geography', done => {
    request
      .get('/geographies/notarealgeography')
      .set('Authorization', AUTH)
      .expect(400)
      .end((err, result) => {
        test.value(result.body.result === 'not found')
        done(err)
      })
  })

  it('read back one policy', async () => {
    await db.writePolicy(POLICY_JSON)
    await db.publishPolicy(POLICY_UUID)
    request
      .get(`/policies/${POLICY_UUID}`)
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        const body = result.body
        log('read back one policy response:', body)
        test.value(result).hasHeader('content-type', APP_JSON)
        // TODO verify contents
        return err
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

  it('read back all policies', async () => {
    await db.writeGeography({ geography_id: GEOGRAPHY2_UUID, geography_json: veniceSpecialOpsZone })
    await db.writePolicy(POLICY2_JSON)
    await db.publishPolicy(POLICY2_JSON.policy_id)
    await db.writePolicy(POLICY3_JSON)
    await db.publishPolicy(POLICY3_JSON.policy_id)
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
        return err
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
})
