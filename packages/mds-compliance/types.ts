import { ApiRequest, ApiResponse } from '@mds-core/mds-api-server'
import { ApiAuthorizerClaims } from '@mds-core/mds-api-authorizer'
import { UUID } from '@mds-core/mds-types'

export type ComplianceApiRequest = ApiRequest
export interface ComplianceApiResponse extends ApiResponse {
  locals: {
    claims: ApiAuthorizerClaims
    provider_id: UUID
  }
}
