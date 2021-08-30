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
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable no-plusplus */
/* eslint-disable no-useless-concat */
/* eslint-disable prefer-destructuring */

import { ApiServer } from '@mds-core/mds-api-server'
import { GeographyServiceClient, GeographyServiceManager } from '@mds-core/mds-geography-service'
import {
  PolicyDomainCreateModel,
  PolicyFactory,
  PolicyRepository,
  PolicyServiceClient,
  PolicyServiceManager
} from '@mds-core/mds-policy-service/'
import { TEST1_PROVIDER_ID } from '@mds-core/mds-providers'
import { POLICY2_JSON, POLICY_JSON, PROVIDER_SCOPES, SCOPED_AUTH, venice } from '@mds-core/mds-test-data'
import { Policy } from '@mds-core/mds-types'
import {
  clone,
  days,
  now,
  pathPrefix,
  START_NOW,
  START_ONE_MONTH_AGO,
  START_ONE_MONTH_FROM_NOW,
  START_ONE_WEEK_AGO,
  START_TOMORROW,
  uuid,
  yesterday
} from '@mds-core/mds-utils'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { api } from '../api'
import { POLICY_API_DEFAULT_VERSION } from '../types'

/* eslint-disable-next-line @typescript-eslint/no-var-requires */

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(ApiServer(api))

const ACTIVE_POLICY_JSON = clone(POLICY_JSON)
ACTIVE_POLICY_JSON.publish_date = yesterday()
ACTIVE_POLICY_JSON.start_date = yesterday()

const ACTIVE_MONTH_OLD_POLICY_JSON = clone(POLICY2_JSON)
ACTIVE_MONTH_OLD_POLICY_JSON.publish_date = START_ONE_MONTH_FROM_NOW
const APP_JSON = 'application/vnd.mds.policy+json; charset=utf-8; version=0.4'

const AUTH = `basic ${Buffer.from(`${TEST1_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`
const POLICIES_READ_SCOPE = SCOPED_AUTH(['policies:read'])

const GeographyServer = GeographyServiceManager.controller()
const PolicyServer = PolicyServiceManager.controller()

const createPolicy = async (policy?: PolicyDomainCreateModel) =>
  await PolicyServiceClient.writePolicy(policy || PolicyFactory())

const createPolicyAndGeographyFactory = async (policy?: PolicyDomainCreateModel, geography_overrides = {}) => {
  const createdPolicy = await createPolicy(policy)
  await GeographyServiceClient.writeGeographies([
    {
      name: 'VENICE',
      geography_id: createdPolicy.rules[0].geographies[0],
      geography_json: venice,
      ...geography_overrides
    }
  ])
  return createdPolicy
}

const createPublishedPolicy = async (policy?: PolicyDomainCreateModel) => {
  const createdPolicy = await createPolicyAndGeographyFactory(policy, { publish_date: now() })
  return await PolicyServiceClient.publishPolicy(createdPolicy?.policy_id, createdPolicy.start_date)
}

describe('Tests app', () => {
  beforeAll(async () => {
    await PolicyServer.start()
    await GeographyServer.start()
  })

  beforeEach(async () => await PolicyRepository.deleteAll())

  afterAll(async () => {
    await PolicyServer.stop()
    await GeographyServer.stop()
  })

  it('tries to get policy for invalid dates', async () => {
    const result = await request
      .get(pathPrefix('/policies?start_date=100000&end_date=100'))
      .set('Authorization', AUTH)
      .expect(StatusCodes.BAD_REQUEST)
    expect(result.body.error.reason).toStrictEqual('start_date must be after end_date')
  })

  it('read back one policy', async () => {
    const policy = await createPublishedPolicy()
    const result = await request
      .get(pathPrefix(`/policies/${policy.policy_id}`))
      .set('Authorization', AUTH)
      .expect(StatusCodes.OK)
    const body = result.body
    expect(body.version).toStrictEqual(POLICY_API_DEFAULT_VERSION)
    expect(result.header['content-type']).toStrictEqual(APP_JSON)
    expect(result.body.data.policy.policy_id).toStrictEqual(policy.policy_id)
  })

  it('reads back all active policies', async () => {
    const policy = await createPublishedPolicy(PolicyFactory({ start_date: now() }))
    const result = await request.get(pathPrefix(`/policies`)).set('Authorization', AUTH).expect(StatusCodes.OK)
    const body = result.body
    expect(body.data.policies.length).toStrictEqual(1) // only one should be currently valid
    expect(body.data.policies[0].policy_id).toStrictEqual(policy.policy_id)
    expect(result.body.data.policies[0]).toStrictEqual(policy)
  })

  it('read back all published policies and no superseded ones', async () => {
    const activePolicy = await createPolicyAndGeographyFactory(
      PolicyFactory({ start_date: START_TOMORROW, end_date: null }),
      { publish_date: START_NOW }
    )
    await PolicyServiceClient.publishPolicy(activePolicy.policy_id, activePolicy.start_date)

    // Active, one-month-old policy
    await createPublishedPolicy(PolicyFactory({ start_date: START_ONE_MONTH_AGO, end_date: START_ONE_WEEK_AGO }))
    // future policy
    await createPublishedPolicy(PolicyFactory({ start_date: START_ONE_MONTH_FROM_NOW }))

    const supersedingPolicy = await createPublishedPolicy(
      PolicyFactory({
        start_date: yesterday(),
        end_date: null,
        prev_policies: [activePolicy.policy_id],
        name: 'Superceding Policy'
      })
    )

    const result = await request
      .get(pathPrefix(`/policies?start_date=${now() - days(365)}&end_date=${now() + days(365)}`))
      .set('Authorization', AUTH)
      .expect(StatusCodes.OK)
    const policies = result.body.data.policies

    expect(policies.length).toStrictEqual(3)

    const isSupersededPolicyPresent = policies.some((policy: Policy) => {
      return policy.policy_id === activePolicy.policy_id
    })
    const isSupersedingPolicyPresent = policies.some((policy: Policy) => {
      return policy.policy_id === supersedingPolicy.policy_id
    })
    expect(isSupersededPolicyPresent).toStrictEqual(false)
    expect(isSupersedingPolicyPresent).toStrictEqual(true)
  })

  it('read back an old policy', async () => {
    // Active, one-month-old policy
    await createPublishedPolicy(PolicyFactory({ start_date: START_ONE_MONTH_AGO, end_date: START_ONE_WEEK_AGO }))

    const result = await request
      .get(pathPrefix(`/policies?start_date=${START_ONE_MONTH_AGO}&end_date=${START_ONE_WEEK_AGO}`))
      .set('Authorization', AUTH)
      .expect(StatusCodes.OK)
    const policies = result.body.data.policies

    expect(policies.length).toStrictEqual(1) // only one
  })

  it('read back current and future policies', async () => {
    // future policy
    await createPublishedPolicy(PolicyFactory({ start_date: START_ONE_MONTH_FROM_NOW }))
    // current policy
    await createPublishedPolicy(PolicyFactory({ publish_date: yesterday(), start_date: yesterday() }))

    const result = await request
      .get(pathPrefix(`/policies?end_date=${now() + days(365)}`))
      .set('Authorization', AUTH)
      .expect(StatusCodes.OK)
    const body = result.body
    log('read back all policies response:', body)
    expect(body.data.policies.length).toStrictEqual(2) // current and future
  })

  it('cannot GET a nonexistent policy', async () => {
    await request
      .get(pathPrefix(`/policies/${uuid()}`)) // obvs not a policy
      .set('Authorization', AUTH)
      .expect(StatusCodes.NOT_FOUND)
  })

  it('tries to read non-UUID policy', async () => {
    await request.get(pathPrefix('/policies/notarealpolicy')).set('Authorization', AUTH).expect(StatusCodes.BAD_REQUEST)
  })

  it('can GET all active, unpublished policies', async () => {
    await createPolicy(PolicyFactory({ start_date: START_ONE_MONTH_AGO, end_date: now() + days(1) }))
    await createPublishedPolicy()

    const result = await request
      .get(pathPrefix(`/policies?get_unpublished=true`))
      .set('Authorization', POLICIES_READ_SCOPE)
      .expect(StatusCodes.OK)
    expect(result.body.data.policies.length).toStrictEqual(1)
  })

  it('can GET one unpublished policy', async () => {
    const unpublished = await createPolicy()
    await request
      .get(pathPrefix(`/policies/${unpublished.policy_id}?get_unpublished=true`))
      .set('Authorization', POLICIES_READ_SCOPE)
      .expect(StatusCodes.OK)
  })

  it('fails to hit non-existent endpoint with a 404', async () => {
    await request.get(pathPrefix(`/foobar`)).set('Authorization', POLICIES_READ_SCOPE).expect(StatusCodes.NOT_FOUND)
  })
})
