import { ApiRequest, ApiResponse } from '@mds-core/mds-api-server'
import { ServerError } from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'

/* istanbul ignore next */
export const InternalServerError = async <T>(req: ApiRequest, res: ApiResponse<T>, err?: string | Error) => {
  // 500 Internal Server Error
  await logger.error(req.method, req.originalUrl, err)
  return res.status(500).send({ error: new ServerError(err) })
}
