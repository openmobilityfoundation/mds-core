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

import { ApiRequest, ApiVersionedResponse, ApiClaims } from '@mds-core/mds-api-server'
import { Geography, GeographyMetadata, GeographySummary } from '@mds-core/mds-types'

export const GEOGRAPHY_API_SUPPORTED_VERSIONS = ['0.1.0'] as const
export type GEOGRAPHY_API_SUPPORTED_VERSION = typeof GEOGRAPHY_API_SUPPORTED_VERSIONS[number]
export const [GEOGRAPHY_API_DEFAULT_VERSION] = GEOGRAPHY_API_SUPPORTED_VERSIONS

export type GeographyApiRequest = ApiRequest

export type GeographyApiAccessTokenScopes =
  | 'geographies:read'
  | 'geographies:read:unpublished'
  | 'geographies:read:published'

export type GeographyApiResponse<TBody extends {}> = ApiVersionedResponse<
  GEOGRAPHY_API_SUPPORTED_VERSION,
  ApiClaims<GeographyApiAccessTokenScopes>,
  TBody
>

export type GetGeographyResponse = GeographyApiResponse<
  { geographies: Geography[] | GeographySummary[] } | { geography: Geography | GeographySummary }
>

export type GetGeographiesResponse = GeographyApiResponse<{
  geographies: Geography[] | GeographySummary[]
}>

export type GetGeographyMetadatumResponse = GeographyApiResponse<{ geography_metadata: GeographyMetadata }>

export type GetGeographyMetadataResponse = GeographyApiResponse<{ geography_metadata: GeographyMetadata[] }>
