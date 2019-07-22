import { ApiRequest, ApiResponse } from 'mds-api-server'
import { ApiAuthorizerClaims } from 'mds-api-authorizer'
import { UUID } from 'mds-types'

export type ComplianceApiRequest = ApiRequest
export interface ComplianceApiResponse extends ApiResponse {
  locals: {
    claims: ApiAuthorizerClaims
    provider_id: UUID
  }
}
