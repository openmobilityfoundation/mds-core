/* eslint-disable no-console */
import {
  DELETEABLE_POLICY,
  POLICY2_JSON,
  POLICY3_JSON,
  POLICY_JSON,
  POLICY_WITH_DUPE_RULE,
  PUBLISHED_POLICY,
  PUBLISH_DATE_VALIDATION_JSON,
  START_ONE_MONTH_AGO,
  START_ONE_MONTH_FROM_NOW
} from '@mds-core/mds-test-data'
import { clone, ConflictError, NotFoundError, now, uuid, yesterday } from '@mds-core/mds-utils'
import { PolicyDomainCreateModel, PolicyMetadataDomainModel } from '../@types'
import { PolicyRepository } from '../repository'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ACTIVE_POLICY_JSON = { ...POLICY_JSON, publish_date: yesterday(), start_date: yesterday() }

const SIMPLE_POLICY_JSON: PolicyDomainCreateModel = {
  name: 'MDSPolicy 1',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: 'a7ca9ece-ca59-42fb-af5d-4668655b547a',
  start_date: START_ONE_MONTH_FROM_NOW,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      rule_type: 'count',
      rule_id: '7ea0d16e-ad15-4337-9722-9924e3af9146',
      name: 'Greater LA',
      geographies: ['1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'],
      states: { available: [] },
      vehicle_types: [],
      maximum: 3000,
      minimum: 500
    }
  ]
}

describe('Policy Repository Tests', () => {
  beforeAll(async () => {
    await PolicyRepository.initialize()
  })

  it('Run Migrations', async () => {
    await PolicyRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await PolicyRepository.revertAllMigrations()
  })

  afterAll(async () => {
    await PolicyRepository.shutdown()
  })
})

describe('spot check unit test policy functions with SimplePolicy', () => {
  describe('Policy Repository Tests', () => {
    beforeAll(async () => {
      await PolicyRepository.initialize()
    })

    beforeEach(async () => {
      await PolicyRepository.deleteAll()
    })

    afterAll(async () => {
      await PolicyRepository.shutdown()
    })

    it('can CRUD a SimplePolicy', async () => {
      await PolicyRepository.writePolicy(SIMPLE_POLICY_JSON)
      const policy = await PolicyRepository.readPolicy(SIMPLE_POLICY_JSON.policy_id)
      expect(policy.policy_id).toEqual(SIMPLE_POLICY_JSON.policy_id)
      expect(policy.name).toEqual(SIMPLE_POLICY_JSON.name)
      await PolicyRepository.editPolicy({ ...SIMPLE_POLICY_JSON, name: 'simpleton' })
      const updatedPolicy = await PolicyRepository.readPolicy(SIMPLE_POLICY_JSON.policy_id)
      expect(updatedPolicy.policy_id).toEqual(SIMPLE_POLICY_JSON.policy_id)
      expect(updatedPolicy.name).toEqual('simpleton')
      await PolicyRepository.deletePolicy(policy.policy_id)
      await expect(async () => PolicyRepository.readPolicy(policy.policy_id)).rejects.toThrowError(NotFoundError)
    })

    // TODO: Only call from publishPolicy after validating geography in policy-service.ts
    it('can publish a SimplePolicy', async () => {
      await PolicyRepository.writePolicy(SIMPLE_POLICY_JSON)
      await PolicyRepository.publishPolicy(SIMPLE_POLICY_JSON.policy_id, yesterday())
      const result = await PolicyRepository.readPolicies({ get_published: true })
      expect(result.length).toEqual(1)
    })

    it('can delete an unpublished Policy', async () => {
      const { policy_id } = DELETEABLE_POLICY
      await PolicyRepository.writePolicy(DELETEABLE_POLICY)

      expect(await PolicyRepository.isPolicyPublished(policy_id)).toBeFalsy()
      await PolicyRepository.deletePolicy(policy_id)
      const policy_result = await PolicyRepository.readPolicies({
        policy_ids: [policy_id],
        get_published: null,
        get_unpublished: null
      })
      expect(policy_result).toStrictEqual([])
    })

    it("can't delete a non-existent Policy", async () => {
      await expect(PolicyRepository.deletePolicy(uuid())).rejects.toThrowError(NotFoundError)
    })

    it('can write, read, and publish a Policy', async () => {
      await PolicyRepository.writePolicy(ACTIVE_POLICY_JSON)
      /* must publish policy, b/c writePolicy filters out `publish_date` */
      await PolicyRepository.publishPolicy(ACTIVE_POLICY_JSON.policy_id, ACTIVE_POLICY_JSON.start_date)

      await PolicyRepository.writePolicy(POLICY2_JSON)
      await PolicyRepository.writePolicy(POLICY3_JSON)

      // Read all policies, no matter whether published or not.
      const policies = await PolicyRepository.readPolicies()
      expect(policies.length).toEqual(3)
      const unpublishedPolicies = await PolicyRepository.readPolicies({
        get_unpublished: true,
        get_published: null
      })
      expect(unpublishedPolicies.length).toEqual(2)
      const publishedPolicies = await PolicyRepository.readPolicies({
        get_published: true,
        get_unpublished: null
      })
      expect(publishedPolicies.length).toEqual(1)
    })

    it('throws a ConflictError when writing a policy that already exists', async () => {
      await PolicyRepository.writePolicy(ACTIVE_POLICY_JSON)
      await expect(PolicyRepository.writePolicy(ACTIVE_POLICY_JSON)).rejects.toThrowError(ConflictError)
    })

    it('can retrieve Policies that were active at a particular date', async () => {
      await PolicyRepository.writePolicy(ACTIVE_POLICY_JSON)
      await PolicyRepository.publishPolicy(ACTIVE_POLICY_JSON.policy_id, ACTIVE_POLICY_JSON.publish_date)
      await PolicyRepository.writePolicy(PUBLISHED_POLICY)
      await PolicyRepository.publishPolicy(PUBLISHED_POLICY.policy_id, PUBLISHED_POLICY.publish_date)
      const monthAgoPolicies = await PolicyRepository.readActivePolicies(START_ONE_MONTH_AGO)
      expect(monthAgoPolicies.length).toStrictEqual(1)

      const currentlyActivePolicies = await PolicyRepository.readActivePolicies()
      expect(currentlyActivePolicies.length).toStrictEqual(2)
    })

    it('can read a single Policy', async () => {
      await PolicyRepository.writePolicy(ACTIVE_POLICY_JSON)
      await PolicyRepository.publishPolicy(ACTIVE_POLICY_JSON.policy_id, ACTIVE_POLICY_JSON.publish_date)

      const policy = await PolicyRepository.readPolicy(ACTIVE_POLICY_JSON.policy_id)
      expect(policy.policy_id).toStrictEqual(ACTIVE_POLICY_JSON.policy_id)
      expect(policy.name).toStrictEqual(ACTIVE_POLICY_JSON.name)
    })

    it('can find Policies by rule id', async () => {
      await PolicyRepository.writePolicy(SIMPLE_POLICY_JSON)
      const rule_id = '7ea0d16e-ad15-4337-9722-9924e3af9146'
      const policies = await PolicyRepository.readPolicies({ rule_id })
      expect(policies[0].rules.map(rule => rule.rule_id).includes(rule_id)).toBeTruthy()
    })

    it('can read rules by rule id', async () => {
      await PolicyRepository.writePolicy(SIMPLE_POLICY_JSON)
      const rule_id = '7ea0d16e-ad15-4337-9722-9924e3af9146'
      const [rule] = await PolicyRepository.readRule(rule_id)
      expect(rule.name).toStrictEqual(SIMPLE_POLICY_JSON.rules[0].name)
    })

    it('ensures rules are unique when writing new policy', async () => {
      await PolicyRepository.writePolicy(POLICY3_JSON)
      await expect(PolicyRepository.writePolicy(POLICY_WITH_DUPE_RULE)).rejects.toThrowError(ConflictError)
    })

    it('cannot find a nonexistent Policy', async () => {
      await expect(PolicyRepository.readPolicy(uuid())).rejects.toThrowError(NotFoundError)
    })

    it('can tell a Policy is published', async () => {
      await PolicyRepository.writePolicy(ACTIVE_POLICY_JSON)
      await PolicyRepository.publishPolicy(ACTIVE_POLICY_JSON.policy_id, ACTIVE_POLICY_JSON.publish_date)
      await PolicyRepository.writePolicy(POLICY3_JSON)

      const publishedResult = await PolicyRepository.isPolicyPublished(ACTIVE_POLICY_JSON.policy_id)
      expect(publishedResult).toBeTruthy()
      const unpublishedResult = await PolicyRepository.isPolicyPublished(POLICY3_JSON.policy_id)
      expect(unpublishedResult).toBeFalsy()
    })

    it('can edit a Policy', async () => {
      await PolicyRepository.writePolicy(POLICY3_JSON)
      await PolicyRepository.editPolicy({ ...POLICY3_JSON, name: 'a shiny new name' })
      const result = await PolicyRepository.readPolicies({
        policy_ids: [POLICY3_JSON.policy_id],
        get_unpublished: true,
        get_published: null
      })
      expect(result[0].name).toStrictEqual('a shiny new name')
    })

    it('cannot add a rule that already exists in some other policy', async () => {
      await PolicyRepository.writePolicy(ACTIVE_POLICY_JSON)
      await PolicyRepository.writePolicy(POLICY3_JSON)

      const policy = clone(POLICY3_JSON)
      policy.rules[0].rule_id = ACTIVE_POLICY_JSON.rules[0].rule_id
      await expect(PolicyRepository.editPolicy(policy)).rejects.toThrowError(ConflictError)
    })

    it('ensures the publish_date >= start_date', async () => {
      await PolicyRepository.writePolicy(PUBLISH_DATE_VALIDATION_JSON)
      await expect(
        PolicyRepository.publishPolicy(
          PUBLISH_DATE_VALIDATION_JSON.policy_id,
          PUBLISH_DATE_VALIDATION_JSON.publish_date
        )
      ).rejects.toThrowError(ConflictError)

      const validPolicy = clone(PUBLISH_DATE_VALIDATION_JSON)
      validPolicy.start_date = START_ONE_MONTH_FROM_NOW
      await PolicyRepository.editPolicy(validPolicy)
      /* if this succeeds, then no error was thrown: */
      await PolicyRepository.publishPolicy(validPolicy.policy_id, validPolicy.publish_date)
    })

    it('will not edit or delete a published Policy', async () => {
      await PolicyRepository.writePolicy(ACTIVE_POLICY_JSON)
      await PolicyRepository.publishPolicy(ACTIVE_POLICY_JSON.policy_id, ACTIVE_POLICY_JSON.publish_date)
      const publishedPolicy = clone(ACTIVE_POLICY_JSON)
      publishedPolicy.name = 'a shiny new name'
      await expect(PolicyRepository.editPolicy(publishedPolicy)).rejects.toThrow()
      await expect(PolicyRepository.deletePolicy(publishedPolicy.policy_id)).rejects.toThrow()
    })

    it('will throw an error if attempting to edit a nonexistent Policy', async () => {
      const policy = clone(POLICY2_JSON)
      policy.policy_id = '28218022-d333-41be-bda5-1dc4288516d2'
      await expect(PolicyRepository.editPolicy(policy)).rejects.toThrowError(NotFoundError)
    })
  })

  describe('unit test PolicyMetadata functions', () => {
    beforeAll(async () => {
      await PolicyRepository.initialize()
    })

    beforeEach(async () => {
      await PolicyRepository.deleteAll()
    })

    afterAll(async () => {
      await PolicyRepository.shutdown()
    })

    it('.readBulkPolicyMetadata', async () => {
      await PolicyRepository.writePolicy(ACTIVE_POLICY_JSON)
      await PolicyRepository.writePolicy(POLICY2_JSON)
      await PolicyRepository.writePolicy(POLICY3_JSON)

      await PolicyRepository.writePolicyMetadata({
        policy_id: ACTIVE_POLICY_JSON.policy_id,
        policy_metadata: { name: 'policy_json' }
      })
      await PolicyRepository.writePolicyMetadata({
        policy_id: POLICY2_JSON.policy_id,
        policy_metadata: { name: 'policy2_json' }
      })
      await PolicyRepository.writePolicyMetadata({
        policy_id: POLICY3_JSON.policy_id,
        policy_metadata: { name: 'policy3_json' }
      })

      const noParamsResult = await PolicyRepository.readBulkPolicyMetadata()
      expect(noParamsResult.length).toStrictEqual(3)
      const withStartDateResult: PolicyMetadataDomainModel<{ name: string }>[] =
        await PolicyRepository.readBulkPolicyMetadata({
          start_date: now(),
          get_published: null,
          get_unpublished: null
        })
      expect(withStartDateResult.length).toStrictEqual(1)
      expect(withStartDateResult[0].policy_metadata?.name).toStrictEqual('policy3_json')

      const meta = await PolicyRepository.readSinglePolicyMetadata(ACTIVE_POLICY_JSON.policy_id)
      expect(meta.policy_id).toStrictEqual(ACTIVE_POLICY_JSON.policy_id)
    })

    it('updates policy metadata', async () => {
      await PolicyRepository.writePolicy(ACTIVE_POLICY_JSON)
      const metadata = await PolicyRepository.writePolicyMetadata({
        policy_id: ACTIVE_POLICY_JSON.policy_id,
        policy_metadata: { name: 'policy_json' }
      })
      await PolicyRepository.updatePolicyMetadata({
        ...metadata,
        policy_metadata: { name: 'steve' }
      })
      const changedMetadata = (await PolicyRepository.readSinglePolicyMetadata(
        ACTIVE_POLICY_JSON.policy_id
      )) as PolicyMetadataDomainModel<{ name: string }>
      expect(changedMetadata.policy_metadata?.name).toStrictEqual('steve')
    })
  })
})
