import { Policy, UUID, PolicyMetadata } from '@mds-core/mds-types'
import { ApiRequest, ApiVersionedResponse, ApiClaims } from '@mds-core/mds-api-server'

export const POLICY_AUTHOR_API_SUPPORTED_VERSIONS = ['0.4.1'] as const
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

export type GetPoliciesResponse = PolicyAuthorApiResponse<{ data: { policies: Policy[] } }>
export type GetPolicyResponse = PolicyAuthorApiResponse<{ data: { policy: Policy } }>
export type PostPolicyResponse = PolicyAuthorApiResponse<{ data: { policy: Policy } }>
export type PublishPolicyResponse = PolicyAuthorApiResponse<{ data: { policy: Policy } }>
export type EditPolicyResponse = PolicyAuthorApiResponse<{ data: { policy: Policy } }>
export type DeletePolicyResponse = PolicyAuthorApiResponse<{ data: { policy_id: UUID } }>

export type GetPolicyMetadatumResponse = PolicyAuthorApiResponse<{ data: { policy_metadata: PolicyMetadata } }>
export type GetPolicyMetadataResponse = PolicyAuthorApiResponse<{ data: { policy_metadata: PolicyMetadata[] } }>
export type EditPolicyMetadataResponse = PolicyAuthorApiResponse<{ data: { policy_metadata: PolicyMetadata } }>
