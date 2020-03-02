import { ApiVersionMiddleware } from '@mds-core/mds-api-server'
import { NATIVE_API_SUPPORTED_VERSIONS, NATIVE_API_DEFAULT_VERSION } from '../types'

export const NativeApiVersionMiddleware = ApiVersionMiddleware(
  'application/vnd.mds.native+json',
  NATIVE_API_SUPPORTED_VERSIONS
).withDefaultVersion(NATIVE_API_DEFAULT_VERSION)
