import logger from '@mds-core/mds-logger'
import type express from 'express'
import { isServiceError, ErrorCheckFunction } from '@mds-core/mds-service-helpers'
import { AuthorizationError, BadParamsError, ConflictError, NotFoundError, ValidationError } from '@mds-core/mds-utils'
import HttpStatus from 'http-status-codes'
import { ApiRequest, ApiResponse } from '../@types'

const isValidationError = ErrorCheckFunction(ValidationError)
const isBadParamsError = ErrorCheckFunction(BadParamsError)
const isNotFoundError = ErrorCheckFunction(NotFoundError)
const isConflictError = ErrorCheckFunction(ConflictError)
const isAuthorizationError = ErrorCheckFunction(AuthorizationError)

/**
 *
 * @param error Error to handle
 * @param req Express Request Object
 * @param res Express Response Object
 * @param next Unused (for the scope of this fn) express next() fn. Included to align with express type signature.
 * @returns API Client response
 *
 * This middleware is to be used as a global error handling middleware for any and all APIs which wish to utilize it.
 * It simplifies error handling, in an effort to reduce copy-paste and developer errors (e.g. sending detailed errors for internal server errors)
 */
export const ApiErrorHandlingMiddleware = (
  error: Error,
  req: ApiRequest,
  res: ApiResponse,
  next: express.NextFunction
) => {
  const { method, originalUrl } = req

  if (isValidationError(error) || isBadParamsError(error)) return res.status(HttpStatus.BAD_REQUEST).send({ error })
  if (isNotFoundError(error)) return res.status(HttpStatus.NOT_FOUND).send({ error })
  if (isConflictError(error)) return res.status(HttpStatus.CONFLICT).send({ error })
  if (isAuthorizationError(error)) return res.status(HttpStatus.FORBIDDEN).send({ error })
  if (isServiceError(error, 'ServiceUnavailable')) return res.status(HttpStatus.SERVICE_UNAVAILABLE).send({ error })

  logger.error('Fatal API Error (global error handling middleware)', {
    method,
    originalUrl,
    error
  })
  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error })
}
