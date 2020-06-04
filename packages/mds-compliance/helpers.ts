import { Policy } from '@mds-core/mds-types'
import { AllowedProviderIDs } from './constants'

export function clientCanViewPolicyCompliance(
  provider_id: string,
  queried_provider_id: string | undefined,
  policy: Policy
): boolean {
  return (
    policy &&
    // True if the client is looking at a policy that applies to them
    ((policy.provider_ids && policy.provider_ids.includes(provider_id)) ||
      // True if a policy has no provider_ids, meaning it applies to every provider
      !policy.provider_ids ||
      /* True if the client is one of the allowed providers, and either the policy applies to the
       * provider that was queried for, or the policy applies to every provider
       */
      (AllowedProviderIDs.includes(provider_id) &&
        ((policy.provider_ids &&
          policy.provider_ids.length !== 0 &&
          queried_provider_id &&
          policy.provider_ids.includes(queried_provider_id)) ||
          !policy.provider_ids ||
          policy.provider_ids.length === 0)))
  )
}
