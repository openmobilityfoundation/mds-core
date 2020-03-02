import { ApiVersionMiddleware } from '@mds-core/mds-api-server'
import { JURISDICTION_API_SUPPORTED_VERSIONS, JURISDICTION_API_DEFAULT_VERSION } from '../types'

export const JurisdictionApiVersionMiddleware = ApiVersionMiddleware(
  'application/vnd.mds.jurisdiction+json',
  JURISDICTION_API_SUPPORTED_VERSIONS
).withDefaultVersion(JURISDICTION_API_DEFAULT_VERSION)
