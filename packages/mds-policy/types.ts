import { ApiRequest, ApiResponse, ApiClaims } from '@mds-core/mds-api-server'

export type PolicyApiRequest = ApiRequest

export type PolicyApiAccessTokenScopes = never

export type PolicyApiResponse = ApiResponse<ApiClaims<PolicyApiAccessTokenScopes>>
