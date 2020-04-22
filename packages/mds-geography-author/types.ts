import { ApiRequest, ApiResponse, ApiClaims } from '@mds-core/mds-api-server'

export type GeographyAuthorApiRequest = ApiRequest

export type GeographyAuthorApiAccessTokenScopes =
  | 'geographies:read'
  | 'geographies:read:unpublished'
  | 'geographies:read:published'
  | 'geographies:write'
  | 'geographies:publish'

export type GeographyAuthorApiResponse = ApiResponse<ApiClaims<GeographyAuthorApiAccessTokenScopes>>
