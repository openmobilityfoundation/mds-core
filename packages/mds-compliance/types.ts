import { ApiRequest, ApiResponse, ApiResponseLocals } from '@mds-core/mds-api-server'
import { UUID } from '@mds-core/mds-types'

export type ComplianceApiRequest = ApiRequest
export interface ComplianceApiResponse extends ApiResponse {
  locals: ApiResponseLocals & {
    provider_id: UUID
  }
}
