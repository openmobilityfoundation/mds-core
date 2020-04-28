import { Policy, UUID, PolicyMetadata } from '@mds-core/mds-types'
import { ApiRequest, ApiVersionedResponse, ApiClaims } from '@mds-core/mds-api-server'

export const POLICY_AUTHOR_API_SUPPORTED_VERSIONS = ['0.1.0'] as const
export type POLICY_AUTHOR_API_SUPPORTED_VERSION = typeof POLICY_AUTHOR_API_SUPPORTED_VERSIONS[number]
export const [POLICY_AUTHOR_API_DEFAULT_VERSION] = POLICY_AUTHOR_API_SUPPORTED_VERSIONS

export type PolicyAuthorApiRequest = ApiRequest

export type PolicyAuthorApiAccessTokenScopes =
  | 'policies:read'
  | 'policies:write'
  | 'policies:publish'
  | 'policies:delete'

type PolicyAuthorApiResponse<TBody extends {}> = ApiVersionedResponse<
  POLICY_AUTHOR_API_SUPPORTED_VERSION,
  ApiClaims<PolicyAuthorApiAccessTokenScopes>,
  TBody
>

export type GetPoliciesResponse = PolicyAuthorApiResponse<{ policies: Policy[] }>
export type GetPolicyResponse = PolicyAuthorApiResponse<{ policy: Policy }>
export type PostPolicyResponse = PolicyAuthorApiResponse<{ policy: Policy }>
export type PublishPolicyResponse = PolicyAuthorApiResponse<{ policy: Policy }>
export type EditPolicyResponse = PolicyAuthorApiResponse<{ policy: Policy }>
export type DeletePolicyResponse = PolicyAuthorApiResponse<{ policy_id: UUID }>

export type GetPolicyMetadatumResponse = PolicyAuthorApiResponse<{ policy_metadata: PolicyMetadata }>
export type GetPolicyMetadataResponse = PolicyAuthorApiResponse<{ policy_metadata: PolicyMetadata[] }>
export type EditPolicyMetadataResponse = PolicyAuthorApiResponse<{ policy_metadata: PolicyMetadata }>
