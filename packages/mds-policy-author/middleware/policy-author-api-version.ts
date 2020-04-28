import { ApiVersionMiddleware } from '@mds-core/mds-api-server'
import { POLICY_AUTHOR_API_SUPPORTED_VERSIONS, POLICY_AUTHOR_API_DEFAULT_VERSION } from '../types'

export const PolicyAuthorApiVersionMiddleware = ApiVersionMiddleware(
  'application/vnd.mds.policy-author+json',
  POLICY_AUTHOR_API_SUPPORTED_VERSIONS
).withDefaultVersion(POLICY_AUTHOR_API_DEFAULT_VERSION)
