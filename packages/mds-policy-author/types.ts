import { ApiRequest, ApiResponse } from '@mds-core/mds-api-server'

export const POLICY_AUTHOR_API_SUPPORTED_VERSIONS = ['0.1.0'] as const
export type POLICY_AUTHOR_API_SUPPORTED_VERSION = typeof POLICY_AUTHOR_API_SUPPORTED_VERSIONS[number]
export const [POLICY_AUTHOR_API_DEFAULT_VERSION] = POLICY_AUTHOR_API_SUPPORTED_VERSIONS

export type PolicyAuthorApiRequest = ApiRequest
export type PolicyAuthorApiResponse = ApiResponse
