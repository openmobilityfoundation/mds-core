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

import { ServiceResponse, ServiceErrorDescriptor } from '../@types'

export const isServiceError = (error: unknown): error is ServiceErrorDescriptor =>
  (error as ServiceErrorDescriptor).name === '__ServiceErrorDescriptor__'

export const handleServiceResponse = <R>(
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

export const getServiceResult = async <R>(request: Promise<ServiceResponse<R>>): Promise<R> => {
  const response = await request
  if (response.error) {
    throw response.error
  }
  return response.result
}
