/* eslint-disable no-console */
import { GeographyServiceClient, GeographyServiceManager } from '@mds-core/mds-geography-service'
import { POLICY2_JSON, POLICY3_JSON, POLICY_WITH_DUPE_RULE } from '@mds-core/mds-test-data'
import { clone, days, now, START_ONE_MONTH_AGO, START_ONE_MONTH_FROM_NOW, uuid, yesterday } from '@mds-core/mds-utils'
import { PolicyMetadataDomainModel } from '../@types'
import { PolicyServiceClient } from '../client'
import { PolicyRepository } from '../repository'
import { PolicyServiceManager } from '../service/manager'
import { createPolicyAndGeographyFactory, GeographyFactory, PolicyFactory, RulesFactory } from './helpers'

const GeographyServer = GeographyServiceManager.controller()
const PolicyServer = PolicyServiceManager.controller()

describe('spot check unit test policy functions with SimplePolicy', () => {
  describe('Policy Client Tests', () => {
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

    it('cannot publish a policy w/ missing geography', async () => {
      const badPolicy = await PolicyServiceClient.writePolicy(PolicyFactory())
      expect(badPolicy.publish_date).toBeNull()
      await expect(PolicyServiceClient.publishPolicy(badPolicy.policy_id, now())).rejects.toMatchObject({
        type: 'DependencyMissingError'
      })

      const geography = GeographyFactory({ geography_id: badPolicy.rules[0].geographies[0] })
      await GeographyServiceClient.writeGeographies([geography])
      const publishedPolicy = await PolicyServiceClient.publishPolicy(badPolicy.policy_id, now())
      expect(publishedPolicy.publish_date).not.toBeNull()
    })

    it('cannot publish a policy w/ unpublished geography', async () => {
      const badPolicy = await PolicyServiceClient.writePolicy(PolicyFactory())
      expect(badPolicy.publish_date).toBeNull()
      const geography = GeographyFactory({ geography_id: badPolicy.rules[0].geographies[0], publish_date: null })
      await GeographyServiceClient.writeGeographies([geography])
      await expect(PolicyServiceClient.publishPolicy(badPolicy.policy_id, now())).rejects.toMatchObject({
        type: 'DependencyMissingError'
      })
    })

    it('can CRUD a SimplePolicy', async () => {
      const simplePolicy = PolicyFactory()
      await PolicyServiceClient.writePolicy(simplePolicy)
      await GeographyServiceClient.writeGeographies([
        GeographyFactory({ geography_id: simplePolicy.rules[0].geographies[0] })
      ])
      const policy = await PolicyServiceClient.readPolicy(simplePolicy.policy_id)

      expect(policy.policy_id).toEqual(simplePolicy.policy_id)
      expect(policy.name).toEqual(simplePolicy.name)

      await PolicyServiceClient.editPolicy({ ...simplePolicy, name: 'simpleton' })
      const updatedPolicy = await PolicyServiceClient.readPolicy(simplePolicy.policy_id)

      expect(updatedPolicy.policy_id).toEqual(simplePolicy.policy_id)
      expect(updatedPolicy.name).toEqual('simpleton')

      await PolicyServiceClient.deletePolicy(policy.policy_id)
      await expect(PolicyServiceClient.readPolicy(policy.policy_id)).rejects.toMatchObject({
        type: 'NotFoundError'
      })
    })

    it('can publish a SimplePolicy', async () => {
      const geography = GeographyFactory()
      const simplePolicy = PolicyFactory({
        start_date: now() + days(1),
        rules: RulesFactory({ geographies: [geography.geography_id] })
      })
      await GeographyServiceClient.writeGeographies([geography])
      await PolicyServiceClient.writePolicy(simplePolicy)
      await PolicyServiceClient.publishPolicy(simplePolicy.policy_id, now())
      const result = await PolicyServiceClient.readPolicies({ get_published: true })
      expect(result.length).toEqual(1)
    })

    it('can delete an unpublished Policy', async () => {
      const deletablePolicy = PolicyFactory()
      await PolicyServiceClient.writePolicy(deletablePolicy)

      const policy = await PolicyServiceClient.readPolicy(deletablePolicy.policy_id)
      expect(policy.publish_date).toBeFalsy()
      await PolicyServiceClient.deletePolicy(policy.policy_id)
      const policy_result = await PolicyServiceClient.readPolicies(
        {
          policy_ids: [policy.policy_id],
          get_published: null,
          get_unpublished: null
        },
        {}
      )
      expect(policy_result).toStrictEqual([])
    })

    it("can't delete a non-existent Policy", async () => {
      await expect(PolicyServiceClient.deletePolicy(uuid())).rejects.toMatchObject({ type: 'NotFoundError' })
    })

    it('can write, read, and publish a Policy', async () => {
      const simplePolicy = PolicyFactory()
      await PolicyServiceClient.writePolicy(simplePolicy)
      await GeographyServiceClient.writeGeographies([
        GeographyFactory({ geography_id: simplePolicy.rules[0].geographies[0] })
      ])
      /* must publish policy, b/c writePolicy filters out `publish_date` */
      await PolicyServiceClient.publishPolicy(simplePolicy.policy_id, simplePolicy.start_date)

      await PolicyServiceClient.writePolicy(POLICY2_JSON)
      await PolicyServiceClient.writePolicy(POLICY3_JSON)

      /* Read all policies, no matter whether published or not. */
      const policies = await PolicyServiceClient.readPolicies({})
      expect(policies.length).toEqual(3)
      const unpublishedPolicies = await PolicyServiceClient.readPolicies({
        get_unpublished: true,
        get_published: null
      })
      expect(unpublishedPolicies.length).toEqual(2)
      const publishedPolicies = await PolicyServiceClient.readPolicies({
        get_published: true,
        get_unpublished: null
      })
      expect(publishedPolicies.length).toEqual(1)
    })

    it('throws a ConflictError when writing a policy that already exists', async () => {
      const activePolicy = await PolicyServiceClient.writePolicy(PolicyFactory())
      await expect(PolicyServiceClient.writePolicy(activePolicy)).rejects.toMatchObject({ type: 'ConflictError' })
    })

    it('can retrieve Policies that were active at a particular date', async () => {
      const activePolicy = await PolicyServiceClient.writePolicy(PolicyFactory({ start_date: yesterday() }))
      await GeographyServiceClient.writeGeographies([
        GeographyFactory({ geography_id: activePolicy.rules[0].geographies[0] })
      ])
      await PolicyServiceClient.publishPolicy(activePolicy.policy_id, activePolicy.start_date)

      const publishedPolicy = await PolicyServiceClient.writePolicy(
        PolicyFactory({
          start_date: START_ONE_MONTH_AGO,
          publish_date: START_ONE_MONTH_AGO,
          rules: RulesFactory({ geographies: activePolicy.rules[0].geographies })
        })
      )
      await PolicyServiceClient.publishPolicy(publishedPolicy.policy_id, publishedPolicy.start_date)
      const monthAgoPolicies = await PolicyServiceClient.readActivePolicies(START_ONE_MONTH_AGO)
      expect(monthAgoPolicies.length).toStrictEqual(1)

      const currentlyActivePolicies = await PolicyServiceClient.readActivePolicies(now())
      expect(currentlyActivePolicies.length).toStrictEqual(2)
    })

    it('can read a single Policy', async () => {
      const activePolicy = await PolicyServiceClient.writePolicy(PolicyFactory({ start_date: yesterday() }))
      await GeographyServiceClient.writeGeographies([
        GeographyFactory({ geography_id: activePolicy.rules[0].geographies[0] })
      ])
      await PolicyServiceClient.publishPolicy(activePolicy.policy_id, activePolicy.start_date)

      const policy = await PolicyServiceClient.readPolicy(activePolicy.policy_id)
      expect(policy.policy_id).toStrictEqual(activePolicy.policy_id)
      expect(policy.name).toStrictEqual(activePolicy.name)
    })

    it('can find Policies by rule id', async () => {
      const simplePolicy = PolicyFactory()
      await PolicyServiceClient.writePolicy(simplePolicy)
      await GeographyServiceClient.writeGeographies([
        GeographyFactory({ geography_id: simplePolicy.rules[0].geographies[0] })
      ])
      const rule_id = simplePolicy.rules[0].rule_id
      const policies = await PolicyServiceClient.readPolicies({ rule_id })
      expect(policies[0].rules.map(rule => rule.rule_id).includes(rule_id)).toBeTruthy()
    })

    it('ensures rules are unique when writing new policy', async () => {
      await PolicyServiceClient.writePolicy(POLICY3_JSON)
      await expect(PolicyServiceClient.writePolicy(POLICY_WITH_DUPE_RULE)).rejects.toMatchObject({
        type: 'ConflictError'
      })
    })

    it('cannot find a nonexistent Policy', async () => {
      await expect(PolicyServiceClient.readPolicy(uuid())).rejects.toMatchObject({ type: 'NotFoundError' })
    })

    it('can edit a Policy', async () => {
      await PolicyServiceClient.writePolicy(POLICY3_JSON)
      await PolicyServiceClient.editPolicy({ ...POLICY3_JSON, name: 'a shiny new name' })
      const result = await PolicyServiceClient.readPolicies({
        policy_ids: [POLICY3_JSON.policy_id],
        get_unpublished: true,
        get_published: null
      })
      expect(result[0].name).toStrictEqual('a shiny new name')
    })

    it('cannot add a rule that already exists in some other policy', async () => {
      const activePolicy = await PolicyServiceClient.writePolicy(PolicyFactory())
      const otherPolicy = await PolicyServiceClient.writePolicy(PolicyFactory())

      const policy = clone(otherPolicy)
      policy.rules[0].rule_id = activePolicy.rules[0].rule_id
      await expect(PolicyServiceClient.editPolicy(policy)).rejects.toMatchObject({ type: 'ConflictError' })
    })

    it('ensures the publish_date >= start_date', async () => {
      const simplePolicy = PolicyFactory({ start_date: START_ONE_MONTH_AGO })
      await PolicyServiceClient.writePolicy(simplePolicy)
      await GeographyServiceClient.writeGeographies([
        GeographyFactory({ geography_id: simplePolicy.rules[0].geographies[0] })
      ])
      await expect(PolicyServiceClient.publishPolicy(simplePolicy.policy_id, now())).rejects.toMatchObject({
        type: 'ConflictError'
      })

      const validPolicy = clone(simplePolicy)
      validPolicy.start_date = START_ONE_MONTH_FROM_NOW
      await PolicyServiceClient.editPolicy(validPolicy)
      /* if this succeeds, then no error was thrown: */
      await PolicyServiceClient.publishPolicy(validPolicy.policy_id, validPolicy.start_date)
    })

    it('will not edit or delete a published Policy', async () => {
      const activePolicy = await PolicyServiceClient.writePolicy(PolicyFactory({ start_date: yesterday() }))
      await GeographyServiceClient.writeGeographies([
        GeographyFactory({ geography_id: activePolicy.rules[0].geographies[0] })
      ])
      await PolicyServiceClient.publishPolicy(activePolicy.policy_id, activePolicy.start_date)
      const publishedPolicy = clone(activePolicy)
      publishedPolicy.name = 'a shiny new name'

      await expect(PolicyServiceClient.editPolicy(publishedPolicy)).rejects.toMatchObject({
        type: 'ConflictError'
      })
      await expect(PolicyServiceClient.deletePolicy(publishedPolicy.policy_id)).rejects.toMatchObject({
        type: 'ConflictError'
      })
    })

    it('will throw an error if attempting to edit a nonexistent Policy', async () => {
      const policy = clone(POLICY2_JSON)
      policy.policy_id = '28218022-d333-41be-bda5-1dc4288516d2'
      await expect(PolicyServiceClient.editPolicy(policy)).rejects.toMatchObject({ type: 'NotFoundError' })
    })

    describe('unit test PolicyMetadata functions', () => {
      it('.readBulkPolicyMetadata', async () => {
        const thisYesterday = yesterday()
        const p1 = await PolicyServiceClient.writePolicy(PolicyFactory({ start_date: thisYesterday }))
        const p2 = await PolicyServiceClient.writePolicy(PolicyFactory({ start_date: thisYesterday - days(1) }))
        const p3 = await PolicyServiceClient.writePolicy(PolicyFactory({ start_date: thisYesterday - days(1) }))

        await PolicyServiceClient.writePolicyMetadata({
          policy_id: p1.policy_id,
          policy_metadata: { name: 'policy1_json' }
        })
        await PolicyServiceClient.writePolicyMetadata({
          policy_id: p2.policy_id,
          policy_metadata: { name: 'policy2_json' }
        })
        await PolicyServiceClient.writePolicyMetadata({
          policy_id: p3.policy_id,
          policy_metadata: { name: 'policy3_json' }
        })

        const noParamsResult = await PolicyServiceClient.readBulkPolicyMetadata({})
        expect(noParamsResult.length).toStrictEqual(3)

        const withStartDateResult: PolicyMetadataDomainModel<{ name: string }>[] =
          await PolicyServiceClient.readBulkPolicyMetadata({
            start_date: thisYesterday
          })
        expect(withStartDateResult.length).toStrictEqual(1)

        expect(withStartDateResult[0].policy_metadata?.name).toStrictEqual('policy1_json')

        const meta: PolicyMetadataDomainModel<{ name: string }> = await PolicyServiceClient.readSinglePolicyMetadata(
          p1.policy_id
        )
        expect(meta.policy_id).toStrictEqual(p1.policy_id)
        expect(meta.policy_metadata?.name).toStrictEqual('policy1_json')
      })

      it('updates policy metadata', async () => {
        const p1 = await PolicyServiceClient.writePolicy(PolicyFactory())
        const metadata: PolicyMetadataDomainModel<{ name: string }> = await PolicyServiceClient.writePolicyMetadata({
          policy_id: p1.policy_id,
          policy_metadata: { name: 'policy_json' }
        })
        const updatedMeta: PolicyMetadataDomainModel<{ name: string }> = await PolicyServiceClient.updatePolicyMetadata(
          {
            ...metadata,
            policy_metadata: { name: 'steve' }
          }
        )
        expect(updatedMeta.policy_metadata?.name).toStrictEqual('steve')
        const changedMetadata: PolicyMetadataDomainModel<{ name: string }> =
          await PolicyServiceClient.readSinglePolicyMetadata(p1.policy_id)
        expect(changedMetadata.policy_metadata?.name).toStrictEqual('steve')
      })
    })

    describe('Test "Policy Status" behavior', () => {
      describe('Single filter tests', () => {
        it('Can filter for draft policies', async () => {
          const policies = [PolicyFactory(), PolicyFactory()]

          await Promise.all(
            policies.map(policy =>
              createPolicyAndGeographyFactory(PolicyServiceClient, GeographyServiceClient, policy, {
                publish_date: now()
              })
            )
          )

          const [policyToPublish, draftPolicy] = policies

          await PolicyServiceClient.publishPolicy(policyToPublish.policy_id, policyToPublish.start_date)

          const results = await PolicyServiceClient.readPolicies({ statuses: ['draft'] })

          expect(results.length).toStrictEqual(1)
          expect(results[0]).toMatchObject(draftPolicy)
        })

        it('Can filter for active policies', async () => {
          const policies = [PolicyFactory({ start_date: yesterday() }), PolicyFactory()]

          await Promise.all(
            policies.map(policy =>
              createPolicyAndGeographyFactory(PolicyServiceClient, GeographyServiceClient, policy, {
                publish_date: now()
              })
            )
          )

          const [policyToPublish] = policies

          const activePolicy = await PolicyServiceClient.publishPolicy(
            policyToPublish.policy_id,
            policyToPublish.start_date
          )

          const results = await PolicyServiceClient.readPolicies({ statuses: ['active'] })

          expect(results.length).toStrictEqual(1)
          expect(results[0]).toStrictEqual(activePolicy)
        })

        it('Can filter for pending policies', async () => {
          const policies = [PolicyFactory({ start_date: now() + days(1) }), PolicyFactory()]

          await Promise.all(
            policies.map(policy =>
              createPolicyAndGeographyFactory(PolicyServiceClient, GeographyServiceClient, policy, {
                publish_date: now()
              })
            )
          )

          const [policyToPublish] = policies

          const pendingPolicy = await PolicyServiceClient.publishPolicy(policyToPublish.policy_id, yesterday())

          const results = await PolicyServiceClient.readPolicies({ statuses: ['pending'] })

          expect(results.length).toStrictEqual(1)
          expect(results[0]).toStrictEqual(pendingPolicy)
        })

        it('Can filter for deactivated policies', async () => {
          const [firstPolicy, secondPolicy] = (() => {
            const firstPolicy = PolicyFactory({ start_date: yesterday() })
            const secondPolicy = PolicyFactory({ start_date: yesterday(), prev_policies: [firstPolicy.policy_id] })

            return [firstPolicy, secondPolicy]
          })()
          const policies = [firstPolicy, secondPolicy]

          await Promise.all(
            policies.map(policy =>
              createPolicyAndGeographyFactory(PolicyServiceClient, GeographyServiceClient, policy, {
                publish_date: now()
              })
            )
          )

          await PolicyServiceClient.publishPolicy(firstPolicy.policy_id, firstPolicy.start_date)
          await PolicyServiceClient.publishPolicy(secondPolicy.policy_id, secondPolicy.start_date)

          const results = await PolicyServiceClient.readPolicies({ statuses: ['deactivated'] })
          expect(results.length).toStrictEqual(1)
          expect(results[0]).toMatchObject(firstPolicy)
        })

        it('Can filter for expired policies', async () => {
          const policies = [PolicyFactory({ start_date: now() - days(2), end_date: now() - days(1) }), PolicyFactory()]

          await Promise.all(
            policies.map(policy =>
              createPolicyAndGeographyFactory(PolicyServiceClient, GeographyServiceClient, policy, {
                publish_date: now()
              })
            )
          )

          // expiredPolicy is the first, cause ordered lists!
          const [expiredPolicy] = await Promise.all(
            policies.map(policy => PolicyServiceClient.publishPolicy(policy.policy_id, policy.start_date))
          )

          const results = await PolicyServiceClient.readPolicies({ statuses: ['expired'] })

          expect(results.length).toStrictEqual(1)
          expect(results[0]).toStrictEqual(expiredPolicy)
        })
      })

      describe('Multi-filter tests', () => {
        it('Can filter on draft & pending policies simultaneously', async () => {
          const policies = [PolicyFactory({ start_date: now() + days(1) }), PolicyFactory()]

          await Promise.all(
            policies.map(policy =>
              createPolicyAndGeographyFactory(PolicyServiceClient, GeographyServiceClient, policy, {
                publish_date: now()
              })
            )
          )

          const [policyToPublish] = policies

          await PolicyServiceClient.publishPolicy(policyToPublish.policy_id, yesterday())

          const results = await PolicyServiceClient.readPolicies({ statuses: ['pending', 'draft'] })

          expect(results.length).toStrictEqual(2)
        })

        it('Can filter on draft and active policies simultaneously', async () => {
          const policies = [PolicyFactory({ start_date: now() - days(1) }), PolicyFactory()]

          await Promise.all(
            policies.map(policy =>
              createPolicyAndGeographyFactory(PolicyServiceClient, GeographyServiceClient, policy, {
                publish_date: now()
              })
            )
          )

          const [policyToPublish] = policies

          await PolicyServiceClient.publishPolicy(policyToPublish.policy_id, policyToPublish.start_date)

          const results = await PolicyServiceClient.readPolicies({ statuses: ['active', 'draft'] })

          expect(results.length).toStrictEqual(2)
        })

        it('Can filter on active and deactivated policies simultaneously', async () => {
          const [firstPolicy, secondPolicy] = (() => {
            const firstPolicy = PolicyFactory({ start_date: yesterday() })
            const secondPolicy = PolicyFactory({ start_date: yesterday(), prev_policies: [firstPolicy.policy_id] })

            return [firstPolicy, secondPolicy]
          })()
          const policies = [firstPolicy, secondPolicy]

          await Promise.all(
            policies.map(policy =>
              createPolicyAndGeographyFactory(PolicyServiceClient, GeographyServiceClient, policy, {
                publish_date: now()
              })
            )
          )

          await PolicyServiceClient.publishPolicy(firstPolicy.policy_id, firstPolicy.start_date)
          await PolicyServiceClient.publishPolicy(secondPolicy.policy_id, secondPolicy.start_date)

          const results = await PolicyServiceClient.readPolicies({ statuses: ['active', 'deactivated'] })

          expect(results.length).toStrictEqual(2)
        })

        it('Can filter on active and expired policies simultaneously', async () => {
          const policies = [
            PolicyFactory({ start_date: now() - days(2), end_date: now() - days(1) }),
            PolicyFactory({ start_date: now() - days(1) })
          ]

          await Promise.all(
            policies.map(policy =>
              createPolicyAndGeographyFactory(PolicyServiceClient, GeographyServiceClient, policy, {
                publish_date: now()
              })
            )
          )

          await Promise.all(
            policies.map(policy => PolicyServiceClient.publishPolicy(policy.policy_id, policy.start_date))
          )

          const results = await PolicyServiceClient.readPolicies({ statuses: ['expired', 'active'] })

          expect(results.length).toStrictEqual(2)
        })
      })
    })
  })
})
