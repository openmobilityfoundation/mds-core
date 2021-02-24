import log from '@mds-core/mds-logger'
import { isError, isServiceError } from '@mds-core/mds-service-helpers'
import { BadParamsError, ConflictError, NotFoundError, ServerError, ValidationError } from '@mds-core/mds-utils'
import express from 'express'
import HttpStatus from 'http-status-codes'

import { TransactionApiRequest, TransactionApiResponse } from '../@types'

export const TransactionApiErrorMiddleware = (
  error: Error,
  req: TransactionApiRequest,
  res: TransactionApiResponse,
  next: express.NextFunction
) => {
  log.error(req.method, req.originalUrl, error)

  if (isError(error, ValidationError) || isError(error, BadParamsError))
    return res.status(HttpStatus.BAD_REQUEST).send({ error })

  if (isError(error, NotFoundError)) return res.status(HttpStatus.NOT_FOUND).send({ error })

  if (isError(error, ConflictError)) return res.status(HttpStatus.CONFLICT).send({ error })

  if (isServiceError(error, 'ServiceUnavailable')) return res.status(HttpStatus.SERVICE_UNAVAILABLE).send({ error })

  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: new ServerError() })
}
