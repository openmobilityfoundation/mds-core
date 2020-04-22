import { ApiRequest, ApiResponse, ApiClaims } from '@mds-core/mds-api-server'

export type GeographyApiRequest = ApiRequest

export type GeographyApiAccessTokenScopes =
  | 'geographies:read'
  | 'geographies:read:unpublished'
  | 'geographies:read:published'

export type GeographyApiResponse = ApiResponse<ApiClaims<GeographyApiAccessTokenScopes>>
