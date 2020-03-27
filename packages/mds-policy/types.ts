import { ApiRequest, ApiResponse } from '@mds-core/mds-api-server'

export const POLICY_API_SUPPORTED_VERSIONS = ['0.1.0'] as const
export type POLICY_API_SUPPORTED_VERSION = typeof GEOGRAPHY_API_SUPPORTED_VERSIONS[number]
export const [POLICY_API_DEFAULT_VERSION] = GEOGRAPHY_API_SUPPORTED_VERSIONS

// Allow adding type definitions for Express Request objects
export type PolicyApiRequest<P extends Params = ParamsDictionary> = ApiRequest<P>

export interface PolicyApiResponse<TBody extends {}> extends ApiVersionedResponse<GEOGRAPHY_API_SUPPORTED_VERSION, TBody> {
  locals: ApiVersionedResponseLocals<GEOGRAPHY_API_SUPPORTED_VERSION> & {
    provider_id: UUID
  }
}
