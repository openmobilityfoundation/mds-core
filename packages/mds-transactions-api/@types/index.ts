import { ApiRequest, ApiVersionedResponse, ApiResponseLocalsClaims } from '@mds-core/mds-api-server'

export const TRANSACTION_API_SUPPORTED_VERSIONS = ['0.0.1'] as const
export type TRANSACTION_API_SUPPORTED_VERSION = typeof TRANSACTION_API_SUPPORTED_VERSIONS[number]
export const [TRANSACTION_API_DEFAULT_VERSION] = TRANSACTION_API_SUPPORTED_VERSIONS

// Allow adding type definitions for Express Request objects
export type TransactionApiRequest<B = {}> = ApiRequest<B>

export type TransactionApiAccessTokenScopes = 'transactions:read' | 'transactions:read:claim' | 'transactions:write'

export type TransactionApiResponse<B = {}> = ApiVersionedResponse<TRANSACTION_API_SUPPORTED_VERSION, B> &
  ApiResponseLocalsClaims<TransactionApiAccessTokenScopes>
