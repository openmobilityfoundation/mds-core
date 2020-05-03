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

export interface ServiceErrorDescriptor {
  type: 'ServiceException' | 'NotFoundError' | 'ConflictError' | 'ValidationError'
  message: string
  details?: string
}

export interface ServiceErrorType {
  error: ServiceErrorDescriptor
}

export interface ServiceResultType<R> {
  error: null
  result: R
}

export type ServiceResponse<R> = ServiceErrorType | ServiceResultType<R>

export const ServiceResult = <R>(result: R): ServiceResultType<R> => ({ error: null, result })

export const ServiceError = (error: ServiceErrorDescriptor): ServiceErrorType => ({ error })

export type ServiceProvider<TServiceInterface> = TServiceInterface & {
  initialize: () => Promise<void>
  shutdown: () => Promise<void>
}
