import { ApiVersionMiddleware } from '@mds-core/mds-api-server'
import { TRANSACTION_API_SUPPORTED_VERSIONS, TRANSACTION_API_DEFAULT_VERSION } from '../@types'

export const TransactionApiVersionMiddleware = ApiVersionMiddleware(
  'application/vnd.mds.transaction+json',
  TRANSACTION_API_SUPPORTED_VERSIONS
).withDefaultVersion(TRANSACTION_API_DEFAULT_VERSION)
