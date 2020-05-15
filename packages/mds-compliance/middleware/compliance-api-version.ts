import { ApiVersionMiddleware } from '@mds-core/mds-api-server'
import { COMPLIANCE_API_SUPPORTED_VERSIONS, COMPLIANCE_API_DEFAULT_VERSION } from '../types'

export const ComplianceApiVersionMiddleware = ApiVersionMiddleware(
  'application/vnd.mds.compliance+json',
  COMPLIANCE_API_SUPPORTED_VERSIONS
).withDefaultVersion(COMPLIANCE_API_DEFAULT_VERSION)
