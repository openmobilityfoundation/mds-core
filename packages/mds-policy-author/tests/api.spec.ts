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
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import should from 'should'
/* eslint-enable prettier/prettier */
/* eslint-enable @typescript-eslint/no-unused-vars */
import { ApiServer } from '@mds-core/mds-api-server'
import { GeographyServiceClient, GeographyServiceManager } from '@mds-core/mds-geography-service'
// eslint-disable-next-line prettier/prettier
import { PolicyDomainCreateModel, PolicyMetadataDomainModel, PolicyServiceClient } from '@mds-core/mds-policy-service'
import { PolicyRepository } from '@mds-core/mds-policy-service/repository'
import { PolicyServiceManager } from '@mds-core/mds-policy-service/service/manager'
import { PolicyFactory } from '@mds-core/mds-policy-service/tests/helpers'
import { SCOPED_AUTH, venice } from '@mds-core/mds-test-data'
import { days, isUUID, now, pathPrefix, uuid } from '@mds-core/mds-utils'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import test from 'unit.js'
import { api } from '../api'
import { injectModalityValidator, injectVersionMiddleware } from '../middleware'
import { POLICY_AUTHOR_API_DEFAULT_VERSION } from '../types'

/* eslint-disable-next-line no-console */
const log = console.log.bind(console)

const request = supertest(
  api(
    injectModalityValidator(
      injectVersionMiddleware(
        ApiServer(app => {
          return app
        })
      )
    )
  )
)

const GeographyServer = GeographyServiceManager.controller()
const PolicyServer = PolicyServiceManager.controller()

const APP_JSON = 'application/vnd.mds.policy-author+json; charset=utf-8; version=0.4'
const EMPTY_SCOPE = SCOPED_AUTH([], '')
const EVENTS_READ_SCOPE = SCOPED_AUTH(['events:read'])
const POLICIES_WRITE_SCOPE = SCOPED_AUTH(['policies:write'])
const POLICIES_READ_SCOPE = SCOPED_AUTH(['policies:read'])
const POLICIES_PUBLISH_SCOPE = SCOPED_AUTH(['policies:publish'])
const POLICIES_DELETE_SCOPE = SCOPED_AUTH(['policies:delete'])

const createPolicy = async (policy?: PolicyDomainCreateModel) =>
  await PolicyServiceClient.writePolicy(policy || PolicyFactory())

const createPolicyAndGeographyFactory = async (policy?: PolicyDomainCreateModel, geography_overrides = {}) => {
  const createdPolicy = await PolicyServiceClient.writePolicy(policy || PolicyFactory())
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
  const policyContent = policy || PolicyFactory()
  const newPolicy = await createPolicyAndGeographyFactory(policyContent, { publish_date: now() })
  return await PolicyServiceClient.publishPolicy(newPolicy?.policy_id, policyContent.start_date)
}

const createPolicyMetadata = async (policy: PolicyDomainCreateModel, policy_metadata = {}) => {
  return await PolicyServiceClient.writePolicyMetadata({ policy_id: policy?.policy_id, policy_metadata })
}

describe('Tests app', () => {
  describe('Policy tests', () => {
    beforeAll(async () => {
      await GeographyServer.start()
      await PolicyServer.start()
      await PolicyRepository.initialize()
    })

    beforeEach(async () => {
      await PolicyRepository.deleteAll()
    })

    afterAll(async () => {
      await PolicyRepository.deleteAll()
      await PolicyRepository.shutdown()
      await GeographyServer.stop()
      await PolicyServer.stop()
    })

    it('cannot create one current policy (no authorization)', async () => {
      const policy = PolicyFactory()
      await request
        .post(pathPrefix(`/policies`))
        .set('Authorization', EMPTY_SCOPE)
        .send(policy)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('cannot create one current policy (wrong authorization)', async () => {
      const policy = PolicyFactory()
      await request
        .post(pathPrefix(`/policies`))
        .set('Authorization', EVENTS_READ_SCOPE)
        .send(policy)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('tries to post invalid policy', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bad_policy_json: any = PolicyFactory()

      bad_policy_json.rules[0].rule_type = 'blah'

      const bad_policy = bad_policy_json
      const { body } = await request
        .post(pathPrefix(`/policies`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(bad_policy)
        .expect(StatusCodes.BAD_REQUEST)

      test.value(body.error.info.details[0].message).contains('rule_type')
    })

    it('verifies cannot PUT policy (no auth)', async () => {
      const policy = PolicyFactory()
      await request
        .put(pathPrefix(`/policies/d2e31798-f22f-4034-ad36-1f88621b276a`))
        .set('Authorization', EMPTY_SCOPE)
        .send(policy)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('verifies cannot PUT policy (wrong auth)', async () => {
      const policy = PolicyFactory()
      await request
        .put(pathPrefix(`/policies/d2e31798-f22f-4034-ad36-1f88621b276a`))
        .set('Authorization', EVENTS_READ_SCOPE)
        .send(policy)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('verifies cannot PUT non-existent policy', async () => {
      await request
        .put(pathPrefix(`/policies/${uuid()}`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(PolicyFactory())
        .expect(StatusCodes.NOT_FOUND)
    })

    it('fails to hit non-existent endpoint with a 404', async () => {
      await request.get(pathPrefix(`/foobar`)).set('Authorization', POLICIES_WRITE_SCOPE).expect(StatusCodes.NOT_FOUND)
    })

    it('creates one current policy', async () => {
      const policy = PolicyFactory()
      await request
        .post(pathPrefix(`/policies`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(StatusCodes.CREATED)
    })

    it('verifies cannot POST duplicate policy', async () => {
      const policy = PolicyFactory()
      await createPolicy(policy)
      await request.post(pathPrefix(`/policies`)).set('Authorization', POLICIES_WRITE_SCOPE).send(policy).expect(409)
    })

    it('verifies cannot PUT invalid policy', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bad_policy_json: any = PolicyFactory()
      bad_policy_json.rules[0].rule_type = 'blueberries'

      const bad_policy = bad_policy_json
      await request
        .put(pathPrefix(`/policies/${bad_policy_json.policy_id}`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(bad_policy)
        .expect(400)
    })

    it('edits one current policy', async () => {
      const policy = PolicyFactory()
      await createPolicy(policy)
      policy.name = 'a shiny new name'
      const apiResult = await request
        .put(pathPrefix(`/policies/${policy.policy_id}`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(200)

      test.value(apiResult.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)

      const [result] = await PolicyServiceClient.readPolicies({
        policy_ids: [policy.policy_id],
        get_unpublished: true,
        get_published: null
      })
      test.value(result.name).is('a shiny new name')
    })

    it('creates one past policy', async () => {
      const policy = PolicyFactory({ start_date: now() - days(30), end_date: now() - days(7) })
      await request
        .post(pathPrefix(`/policies`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(StatusCodes.CREATED)
    })

    it('creates one future new policy', async () => {
      const policy = PolicyFactory({ start_date: now() + days(30), end_date: null })
      await request
        .post(pathPrefix(`/policies`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(StatusCodes.CREATED)
    })

    it('verifies cannot publish a policy (no auth)', async () => {
      const policy = await createPolicy()
      await request
        .post(pathPrefix(`/policies/${policy.policy_id}/publish`))
        .set('Authorization', EMPTY_SCOPE)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('verifies cannot publish a policy (wrong auth)', async () => {
      const policy = await createPolicy()
      await request
        .post(pathPrefix(`/policies/${policy.policy_id}/publish`))
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('verifies cannot publish a policy with missing geographies', async () => {
      const policy = await createPolicy()
      await request
        .post(pathPrefix(`/policies/${policy.policy_id}/publish`))
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(StatusCodes.FAILED_DEPENDENCY)
    })

    it('verifies cannot publish a policy that was never POSTed', async () => {
      await request
        .post(pathPrefix(`/policies/${uuid()}/publish`))
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(StatusCodes.NOT_FOUND)
    })

    it('cannot publish a policy if the geo is not published', async () => {
      const policy = await createPolicyAndGeographyFactory()
      const result = await request
        .post(pathPrefix(`/policies/${policy.policy_id}/publish`))
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(StatusCodes.FAILED_DEPENDENCY)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('can publish a policy if the geo is published', async () => {
      const policy = await createPolicyAndGeographyFactory(PolicyFactory(), { publish_date: now() })
      const result = await request
        .post(pathPrefix(`/policies/${policy.policy_id}/publish`))
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(StatusCodes.OK)
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('cannot double-publish a policy', async () => {
      const policy = await createPolicyAndGeographyFactory(PolicyFactory(), { publish_date: now() })
      await request
        .post(pathPrefix(`/policies/${policy.policy_id}/publish`))
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(200)
      await request
        .post(pathPrefix(`/policies/${policy.policy_id}/publish`))
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(409)
    })

    it('cannot edit a published policy (no auth)', async () => {
      const policy = await createPublishedPolicy()
      policy.name = 'an even shinier new name'
      await request
        .put(pathPrefix(`/policies/${policy.policy_id}`))
        .set('Authorization', EMPTY_SCOPE)
        .send(policy)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('cannot edit a published policy (wrong auth)', async () => {
      const policy = await createPublishedPolicy()
      policy.name = 'an even shinier new name'
      await request
        .put(pathPrefix(`/policies/${policy.policy_id}`))
        .set('Authorization', EVENTS_READ_SCOPE)
        .send(policy)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('cannot edit a published policy', async () => {
      const policy = await createPublishedPolicy()
      policy.name = 'an even shinier new name'
      await request
        .put(pathPrefix(`/policies/${policy.policy_id}`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(StatusCodes.BAD_REQUEST)
    })

    it('cannot delete an unpublished policy (no auth)', async () => {
      const policy = await createPolicy()
      await request
        .delete(pathPrefix(`/policies/${policy.policy_id}`))
        .set('Authorization', EMPTY_SCOPE)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('cannot delete an unpublished policy (wrong auth)', async () => {
      const policy = await createPolicy()
      await request
        .delete(pathPrefix(`/policies/${policy.policy_id}`))
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('can delete an unpublished policy', async () => {
      const policy = await createPolicy()
      const result = await request
        .delete(pathPrefix(`/policies/${policy.policy_id}`))
        .set('Authorization', POLICIES_DELETE_SCOPE)
        .expect(StatusCodes.OK)

      const body = result.body
      log('read back nonexistent policy response:', body)
      test.value(result).hasHeader('content-type', APP_JSON)
      test.value(result.body.version).is(POLICY_AUTHOR_API_DEFAULT_VERSION)
      await PolicyServiceClient.readPolicies({
        policy_ids: [policy.policy_id],
        get_published: null,
        get_unpublished: null
      }).should.be.fulfilledWith([])
    })

    it('cannot delete a published policy', async () => {
      const policy = await createPublishedPolicy()
      await request
        .delete(pathPrefix(`/policies/${policy.policy_id}`))
        .set('Authorization', POLICIES_DELETE_SCOPE)
        .expect(StatusCodes.CONFLICT)
    })

    it('cannot publish a policy if the start_date would precede the publish_date', async () => {
      const policy = await createPolicyAndGeographyFactory(PolicyFactory({ start_date: now() - days(30) }), {
        publish_date: now()
      })
      const result = await request
        .post(pathPrefix(`/policies/${policy.policy_id}/publish`))
        .set('Authorization', POLICIES_PUBLISH_SCOPE)
        .expect(StatusCodes.CONFLICT)
      test.value(result.body.error.reason, 'Policies cannot be published after their start_date')
    })

    it('cannot GET policy metadata (no entries exist)', async () => {
      await request
        .get(pathPrefix(`/policies/meta`))
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(StatusCodes.NOT_FOUND)
    })

    it('cannot PUTing policy metadata to create (no auth)', async () => {
      const policy = await createPolicy()
      const metadata = { some_arbitrary_thing: 'boop' }
      await request
        .put(pathPrefix(`/policies/${policy.policy_id}/meta`))
        .set('Authorization', EMPTY_SCOPE)
        .send({ policy_id: policy.policy_id, policy_metadata: metadata })
        .expect(StatusCodes.FORBIDDEN)
    })

    it('cannot PUTing policy metadata to create (wrong auth)', async () => {
      const policy = await createPolicy()
      const metadata = { some_arbitrary_thing: 'boop' }
      await request
        .put(pathPrefix(`/policies/${policy.policy_id}/meta`))
        .set('Authorization', EVENTS_READ_SCOPE)
        .send({ policy_id: policy.policy_id, policy_metadata: metadata })
        .expect(StatusCodes.FORBIDDEN)
    })

    it('verifies PUTing policy metadata to create', async () => {
      const policy = await createPolicy()
      const metadata = { some_arbitrary_thing: 'boop' }
      const apiResult = await request
        .put(pathPrefix(`/policies/${policy.policy_id}/meta`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send({ policy_id: policy.policy_id, policy_metadata: metadata })
        .expect(StatusCodes.CREATED)

      expect(apiResult.body.version).toStrictEqual(POLICY_AUTHOR_API_DEFAULT_VERSION)

      const result: PolicyMetadataDomainModel<{ some_arbitrary_thing: string }> =
        await PolicyServiceClient.readSinglePolicyMetadata(policy.policy_id)
      expect(result.policy_metadata?.some_arbitrary_thing).toStrictEqual('boop')
    })

    it('verifies PUTing policy metadata to edit', async () => {
      const policy = await createPolicy()
      const meta = await createPolicyMetadata(policy, { some_arbitrary_thing: 'boop' })
      const metadata = { some_arbitrary_thing: 'beep' }
      await request
        .put(pathPrefix(`/policies/${meta.policy_id}/meta`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send({ policy_id: meta.policy_id, policy_metadata: metadata })
        .expect(StatusCodes.OK)

      const result: PolicyMetadataDomainModel<{ some_arbitrary_thing: string }> =
        await PolicyServiceClient.readSinglePolicyMetadata(policy.policy_id)
      expect(result.policy_metadata?.some_arbitrary_thing).toStrictEqual('beep')
    })

    it('cannot GET policy metadata (no auth)', async () => {
      const policy = await createPolicy()
      await request
        .get(pathPrefix(`/policies/${policy.policy_id}/meta`))
        .set('Authorization', EMPTY_SCOPE)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('cannot GET policy metadata (wrong auth)', async () => {
      const policy = await createPolicy()
      await request
        .get(pathPrefix(`/policies/${policy.policy_id}/meta`))
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('verifies GETing policy metadata when given a policy_id', async () => {
      const policy = await createPolicy()
      const meta = await createPolicyMetadata(policy, { some_arbitrary_thing: 'beep' })
      const result = await request
        .get(pathPrefix(`/policies/${meta.policy_id}/meta`))
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(StatusCodes.OK)

      expect(result.body.data.policy_metadata.policy_metadata.some_arbitrary_thing).toStrictEqual('beep')
    })

    it('verifies cannot GET non-uuid policy_id metadata', async () => {
      await request
        .get(pathPrefix(`/policies/beepbapboop/meta`))
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(StatusCodes.BAD_REQUEST)
    })

    it('verifies cannot GET non-existent policy metadata', async () => {
      await request
        .get(pathPrefix(`/policies/${uuid()}/meta`))
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(StatusCodes.NOT_FOUND)
    })

    it('cannot GET policy metadata (no auth)', async () => {
      await request.get(pathPrefix(`/policies/meta`)).set('Authorization', EMPTY_SCOPE).expect(StatusCodes.FORBIDDEN)
    })

    it('cannot GET policy metadata (wrong auth)', async () => {
      await request
        .get(pathPrefix(`/policies/meta`))
        .set('Authorization', EVENTS_READ_SCOPE)
        .expect(StatusCodes.FORBIDDEN)
    })

    it('cannot GET policy metadata with both get_published and get_unpublished set to true', async () => {
      await request
        .get(pathPrefix(`/policies/meta?get_published=true&get_unpublished=true`))
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(StatusCodes.BAD_REQUEST)
    })

    it('verifies GETting policy metadata with the same params as for bulk policy reads', async () => {
      const policy = await createPolicy()
      await createPolicyMetadata(policy, { some_arbitrary_thing: 'boop' })

      const result = await request
        .get(pathPrefix(`/policies/meta`))
        .set('Authorization', POLICIES_READ_SCOPE)
        .expect(StatusCodes.OK)
      expect(result.body.data.policy_metadata.length).toStrictEqual(1)
    })

    it('generates a UUID for a policy that has no UUID', async () => {
      const policy: any = PolicyFactory()
      policy.policy_id = null
      const result = await request
        .post(pathPrefix(`/policies`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(StatusCodes.CREATED)
      expect(isUUID(result.body.data.policy.policy_id)).toBeTruthy()
    })

    it('Cannot PUT a policy with publish_date set', async () => {
      const policy = await createPublishedPolicy()
      const result = await request
        .put(pathPrefix(`/policies/${policy.policy_id}`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(400)
      test.assert(result.body.error.name === `ValidationError`)
      test.assert(result.body.error.reason.includes('publish_date'))
      test.value(result).hasHeader('content-type', APP_JSON)
    })

    it('Cannot POST a policy with publish_date set', async () => {
      const policy = await createPublishedPolicy()
      const result = await request
        .post(pathPrefix(`/policies`))
        .set('Authorization', POLICIES_WRITE_SCOPE)
        .send(policy)
        .expect(400)
      test.assert(result.body.error.name === `ValidationError`)
      test.assert(result.body.error.reason.includes('publish_date'))
      test.value(result).hasHeader('content-type', APP_JSON)
    })
  })
})
