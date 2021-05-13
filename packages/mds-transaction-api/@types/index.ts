/**
 * Copyright 2020 City of Los Angeles
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

import { ApiRequest, ApiVersionedResponse, ApiResponseLocalsClaims } from '@mds-core/mds-api-server'

export const TRANSACTION_API_SUPPORTED_VERSIONS = ['0.1.0'] as const
export type TRANSACTION_API_SUPPORTED_VERSION = typeof TRANSACTION_API_SUPPORTED_VERSIONS[number]
export const [TRANSACTION_API_DEFAULT_VERSION] = TRANSACTION_API_SUPPORTED_VERSIONS

// Allow adding type definitions for Express Request objects
export type TransactionApiRequest<B = {}> = ApiRequest<B>

export type TransactionApiAccessTokenScopes = 'transactions:read' | 'transactions:read:provider' | 'transactions:write'

export type TransactionApiResponse<B = {}> = ApiVersionedResponse<TRANSACTION_API_SUPPORTED_VERSION, B> &
  ApiResponseLocalsClaims<TransactionApiAccessTokenScopes>
