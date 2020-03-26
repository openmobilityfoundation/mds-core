import { ApiVersionMiddleware } from '@mds-core/mds-api-server'
import { GEOGRAPHY_AUTHOR_API_SUPPORTED_VERSIONS, GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION } from '../types'

export const GeographyAuthorApiVersionMiddleware = ApiVersionMiddleware(
  'application/vnd.mds.geography.author+json',
  GEOGRAPHY_AUTHOR_API_SUPPORTED_VERSIONS
).withDefaultVersion(GEOGRAPHY_AUTHOR_API_DEFAULT_VERSION)
