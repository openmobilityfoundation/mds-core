import { ApiVersionMiddleware } from '@mds-core/mds-api-server'
import { GEOGRAPHY_API_SUPPORTED_VERSIONS, GEOGRAPHY_API_DEFAULT_VERSION } from '../types'

export const GeographyApiVersionMiddleware = ApiVersionMiddleware(
  'application/vnd.mds.geography+json',
  GEOGRAPHY_API_SUPPORTED_VERSIONS
).withDefaultVersion(GEOGRAPHY_API_DEFAULT_VERSION)
