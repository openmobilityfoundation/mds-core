/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { NotFoundError, ValidationError, ConflictError } from '@mds-core/mds-utils'
import { ServiceResponse, ServiceErrorDescriptor, ServiceError } from './@types'

export const HandleServiceResponse = <R>(
  response: ServiceResponse<R>,
  onerror: (error: ServiceErrorDescriptor) => void,
  onresult: (result: R) => void
): ServiceResponse<R> => {
  if (response.error) {
    onerror(response.error)
  } else {
    onresult(response.result)
  }
  return response
}

export const ServiceException = (message: string, error?: unknown) => {
  const details = (error instanceof Error && error.message) || undefined

  /* istanbul ignore if */
  if (error instanceof NotFoundError) {
    return ServiceError({ type: 'NotFoundError', message, details })
  }

  /* istanbul ignore if */
  if (error instanceof ValidationError) {
    return ServiceError({ type: 'ValidationError', message, details })
  }

  /* istanbul ignore if */
  if (error instanceof ConflictError) {
    return ServiceError({ type: 'ConflictError', message, details })
  }

  return ServiceError({ type: 'ServiceException', message, details })
}
