/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  ApiRequest,
  ApiRequestParams,
  ApiRequestQuery,
  ApiResponseLocalsClaims,
  ApiVersionedResponse
} from '@mds-core/mds-api-server'
import { Geography, GeographyMetadata, UUID } from '@mds-core/mds-types'

export const GEOGRAPHY_AUTHOR_API_SUPPORTED_VERSIONS = ['1.0.0'] as const
export type GEOGRAPHY_AUTHOR_API_SUPPORTED_VERSION = typeof GEOGRAPHY_AUTHOR_API_SUPPORTED_VERSIONS[number]
export const [GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION] = GEOGRAPHY_AUTHOR_API_SUPPORTED_VERSIONS

export type GeographyAuthorApiRequest<B = {}> = ApiRequest<B>

export type GeographyAuthorApiAccessTokenScopes =
  | 'geographies:read'
  | 'geographies:read:unpublished'
  | 'geographies:read:published'
  | 'geographies:write'
  | 'geographies:publish'

export type GeographyAuthorApiGetGeographyMetadataRequest = GeographyAuthorApiRequest &
  ApiRequestQuery<'get_published' | 'get_unpublished'>

export type GeographyAuthorApiPostGeographyRequest = GeographyAuthorApiRequest<Geography>

export type GeographyAuthorApiPutGeographyRequest = GeographyAuthorApiRequest<Geography>

export type GeographyAuthorApiDeleteGeographyRequest = GeographyAuthorApiRequest & ApiRequestParams<'geography_id'>

export type GeographyAuthorApiGetGeographyMetadatumRequest = GeographyAuthorApiRequest &
  ApiRequestParams<'geography_id'>

export type GeographyAuthorApiPutGeographyMetadataRequest = GeographyAuthorApiRequest<GeographyMetadata>

export type GeographyAuthorApiPublishGeographyRequest = GeographyAuthorApiRequest & ApiRequestParams<'geography_id'>

export type GeographyAuthorApiResponse<B = {}> = ApiVersionedResponse<GEOGRAPHY_AUTHOR_API_SUPPORTED_VERSION, B> &
  ApiResponseLocalsClaims<GeographyAuthorApiAccessTokenScopes>

export type GeographyAuthorApiGetGeographyMetadatumResponse = GeographyAuthorApiResponse<{
  data: { geography_metadata: GeographyMetadata }
}>

export type GeographyAuthorApiGetGeographyMetadataResponse = GeographyAuthorApiResponse<{
  data: { geography_metadata: GeographyMetadata[] }
}>

export type GeographyAuthorApiPostGeographyResponse = GeographyAuthorApiResponse<{ data: { geography: Geography } }>

export type GeographyAuthorApiPutGeographyResponse = GeographyAuthorApiResponse<{ data: { geography: Geography } }>
export type GeographyAuthorApiPublishGeographyResponse = GeographyAuthorApiResponse<{ data: { geography: Geography } }>
export type GeographyAuthorApiPutGeographyMetadataResponse = GeographyAuthorApiResponse<{
  data: { geography_metadata: GeographyMetadata }
}>

export type GeographyAuthorApiDeleteGeographyResponse = GeographyAuthorApiResponse<{ data: { geography_id: UUID } }>
