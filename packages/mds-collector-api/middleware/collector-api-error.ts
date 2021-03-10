/**
 * Copyright 2021 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { NextFunction } from 'express'
import logger from '@mds-core/mds-logger'
import { NotFoundError, ValidationError } from '@mds-core/mds-utils'
import HttpStatus from 'http-status-codes'
import { isError, isServiceError } from '@mds-core/mds-service-helpers'
import { CollectorApiRequest, CollectorApiResponse } from '../@types'

export const CollectorApiErrorMiddleware = (
  error: Error,
  req: CollectorApiRequest,
  res: CollectorApiResponse,
  next: NextFunction
) => {
  logger.error('Collector API Error', { method: req.method, originalUrl: req.originalUrl, error })
  if (isError(error, ValidationError)) {
    return res.status(HttpStatus.BAD_REQUEST).send({ error })
  }
  if (isError(error, NotFoundError)) {
    return res.status(HttpStatus.NOT_FOUND).send({ error })
  }
  return res
    .status(
      isServiceError(error, 'ServiceUnavailable') ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.INTERNAL_SERVER_ERROR
    )
    .send({ error })
}
