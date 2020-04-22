import { ApiRequest, ApiResponse, ApiClaims } from '@mds-core/mds-api-server'

export type PolicyAuthorApiRequest = ApiRequest

export type PolicyAuthorApiAccessTokenScopes =
  | 'policies:read'
  | 'policies:write'
  | 'policies:publish'
  | 'policies:delete'

export type PolicyAuthorApiResponse = ApiResponse<ApiClaims<PolicyAuthorApiAccessTokenScopes>>
