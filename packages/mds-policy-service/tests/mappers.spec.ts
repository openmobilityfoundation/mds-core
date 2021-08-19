import { days, now, uuid, yesterday } from '@mds-core/mds-utils'
import { derivePolicyStatus } from '../repository/mappers'
import { PolicyFactory } from './helpers'

describe('Tests Model Mappers', () => {
  it("Should return 'draft'", () => {
    const policy = PolicyFactory()
    const { policy_id } = policy
    const mockPolicyEntity = {
      policy_id,
      policy_json: {
        ...policy,
        provider_ids: [],
        end_date: null,
        prev_policies: [],
        start_date: now() + days(1),
        publish_date: null
      },
      superseded_by: null,
      id: 0
    }

    const status = derivePolicyStatus(mockPolicyEntity)

    expect(status).toBe('draft')
  })

  it("Should return 'pending'", () => {
    const policy = PolicyFactory()
    const { policy_id } = policy
    const mockPolicyEntity = {
      policy_id,
      policy_json: {
        ...policy,
        provider_ids: [],
        end_date: null,
        prev_policies: [],
        start_date: now() + days(1),
        publish_date: yesterday()
      },
      superseded_by: null,
      id: 0
    }

    const status = derivePolicyStatus(mockPolicyEntity)

    expect(status).toBe('pending')
  })

  describe("Tests 'policy status' derivation", () => {
    it("Should return 'active'", () => {
      const policy = PolicyFactory()
      const { policy_id } = policy
      const mockPolicyEntity = {
        policy_id,
        policy_json: {
          ...policy,
          provider_ids: [],
          end_date: null,
          prev_policies: [],
          start_date: yesterday(),
          publish_date: yesterday()
        },
        superseded_by: null,
        id: 0
      }

      const status = derivePolicyStatus(mockPolicyEntity)

      expect(status).toBe('active')
    })
  })

  it("Should return 'expired'", () => {
    const policy = PolicyFactory()
    const { policy_id } = policy
    const mockPolicyEntity = {
      policy_id,
      policy_json: {
        ...policy,
        provider_ids: [],
        end_date: now() - days(1),
        prev_policies: [],
        start_date: now() - days(2),
        publish_date: now() - days(2)
      },
      superseded_by: null,
      id: 0
    }

    const status = derivePolicyStatus(mockPolicyEntity)

    expect(status).toBe('expired')
  })

  it("Should return 'deactivated'", () => {
    const policy = PolicyFactory()
    const { policy_id } = policy
    const mockPolicyEntity = {
      policy_id,
      policy_json: {
        ...policy,
        provider_ids: [],
        end_date: null,
        prev_policies: [],
        start_date: yesterday(),
        publish_date: yesterday()
      },
      superseded_by: [uuid()],
      id: 0
    }

    const status = derivePolicyStatus(mockPolicyEntity)

    expect(status).toBe('deactivated')
  })
})
