import { ApiVersionMiddleware } from '@mds-core/mds-api-server'
import { POLICY_API_SUPPORTED_VERSIONS, POLICY_API_DEFAULT_VERSION } from '../types'

export const PolicyApiVersionMiddleware = ApiVersionMiddleware(
  'application/vnd.mds.policy+json',
  POLICY_API_SUPPORTED_VERSIONS
).withDefaultVersion(POLICY_API_DEFAULT_VERSION)
