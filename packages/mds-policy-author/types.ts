import { Policy, UUID, PolicyMetadata, Optional } from '@mds-core/mds-types'
import {
  ApiRequest,
  ApiVersionedResponse,
  ApiRequestParams,
  ApiRequestQuery,
  ApiResponseLocalsClaims
} from '@mds-core/mds-api-server'

export const POLICY_AUTHOR_API_SUPPORTED_VERSIONS = ['0.4.1'] as const
export type POLICY_AUTHOR_API_SUPPORTED_VERSION = typeof POLICY_AUTHOR_API_SUPPORTED_VERSIONS[number]
export const [POLICY_AUTHOR_API_DEFAULT_VERSION] = POLICY_AUTHOR_API_SUPPORTED_VERSIONS

export type PolicyAuthorApiRequest<B = {}> = ApiRequest<B>

export type PolicyAuthorApiPostPolicyRequest = PolicyAuthorApiRequest<Optional<Policy, 'policy_id'>>
export type PolicyAuthorApiPublishPolicyRequest = PolicyAuthorApiRequest & ApiRequestParams<'policy_id'>
export type PolicyAuthorApiEditPolicyRequest = PolicyAuthorApiRequest<Policy>
export type PolicyAuthorApiDeletePolicyRequest = PolicyAuthorApiRequest & ApiRequestParams<'policy_id'>
export type PolicyAuthorApiGetPolicyMetadataRequest = PolicyAuthorApiRequest &
  ApiRequestQuery<'get_published' | 'get_unpublished'>
export type PolicyAuthorApiGetPolicyMetadatumRequest = PolicyAuthorApiRequest & ApiRequestParams<'policy_id'>
export type PolicyAuthorApiEditPolicyMetadataRequest = PolicyAuthorApiRequest<PolicyMetadata>

export type PolicyAuthorApiAccessTokenScopes =
  | 'policies:read'
  | 'policies:write'
  | 'policies:publish'
  | 'policies:delete'

type PolicyAuthorApiResponse<B = {}> = ApiVersionedResponse<POLICY_AUTHOR_API_SUPPORTED_VERSION, B> &
  ApiResponseLocalsClaims<PolicyAuthorApiAccessTokenScopes>

export type PolicyAuthorApiGetPoliciesResponse = PolicyAuthorApiResponse<{ data: { policies: Policy[] } }>
export type PolicyAuthorApiGetPolicyResponse = PolicyAuthorApiResponse<{ data: { policy: Policy } }>
export type PolicyAuthorApiPostPolicyResponse = PolicyAuthorApiResponse<{ data: { policy: Policy } }>
export type PolicyAuthorApiPublishPolicyResponse = PolicyAuthorApiResponse<{ data: { policy: Policy } }>
export type PolicyAuthorApiEditPolicyResponse = PolicyAuthorApiResponse<{ data: { policy: Policy } }>
export type PolicyAuthorApiDeletePolicyResponse = PolicyAuthorApiResponse<{ data: { policy_id: UUID } }>

export type PolicyAuthorApiGetPolicyMetadatumResponse = PolicyAuthorApiResponse<{
  data: { policy_metadata: PolicyMetadata }
}>
export type PolicyAuthorApiGetPolicyMetadataResponse = PolicyAuthorApiResponse<{
  data: { policy_metadata: PolicyMetadata[] }
}>
export type PolicyAuthorApiEditPolicyMetadataResponse = PolicyAuthorApiResponse<{
  data: { policy_metadata: PolicyMetadata }
}>
