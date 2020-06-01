/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import {
  ApiRequest,
  ApiVersionedResponse,
  ApiClaims,
  ApiResponseLocals,
  ApiRequestParams,
  ApiRequestQuery
} from '@mds-core/mds-api-server'
import { Geography, GeographySummary } from '@mds-core/mds-types'

export const GEOGRAPHY_API_SUPPORTED_VERSIONS = ['0.4.1'] as const
export type GEOGRAPHY_API_SUPPORTED_VERSION = typeof GEOGRAPHY_API_SUPPORTED_VERSIONS[number]
export const [GEOGRAPHY_API_DEFAULT_VERSION] = GEOGRAPHY_API_SUPPORTED_VERSIONS

export type GeographyApiRequest<B = {}> = ApiRequest<B>

export type GeographyApiGetGeographyRequest = GeographyApiRequest & ApiRequestParams<'geography_id'>

export type GeographyApiGetGeographiesRequest = GeographyApiRequest &
  ApiRequestQuery<'summary' | 'get_published' | 'get_unpublished'>

export type GeographyApiAccessTokenScopes =
  | 'geographies:read'
  | 'geographies:read:unpublished'
  | 'geographies:read:published'

export type GeographyApiResponse<B = {}> = ApiVersionedResponse<GEOGRAPHY_API_SUPPORTED_VERSION, B> &
  ApiResponseLocals<ApiClaims<GeographyApiAccessTokenScopes>>

export type GeographyApiGetGeographyResponse = GeographyApiResponse<{
  data: { geographies: Geography[] | GeographySummary[] } | { geography: Geography | GeographySummary }
}>

export type GeographyApiGetGeographiesResponse = GeographyApiResponse<{
  data: { geographies: Geography[] | GeographySummary[] }
}>
