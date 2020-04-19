/* eslint-disable no-console */
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

interface ServiceErrorDescriptor {
  type: 'ServiceException' | 'NotFoundError' | 'ConflictError' | 'ValidationError'
  message: string
  details?: string
}

interface ServiceErrorType {
  error: ServiceErrorDescriptor
}

interface ServiceResultType<R> {
  error: null
  result: R
}

export type ServiceResponse<R> = ServiceErrorType | ServiceResultType<R>

export const ServiceResult = <R>(result: R): ServiceResultType<R> => ({ error: null, result })

export const ServiceError = (error: ServiceErrorDescriptor): ServiceErrorType => ({ error })

export const HandleServiceResponse = <R>(
  response: ServiceResponse<R>,
  onerror: (error: ServiceErrorDescriptor) => void,
  onresult: (result: R) => void
) => (response.error ? onerror(response.error) : onresult(response.result))

export const ServiceException = (message: string, error?: Error) =>
  ServiceError({
    type: 'ServiceException',
    message,
    details: (error instanceof Error && error.message) || undefined
  })

export type ServiceProvider<TServiceInterface> = TServiceInterface & {
  initialize: () => Promise<void>
  shutdown: () => Promise<void>
}
