/**
 * Copyright 2019 City of Los Angeles
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

import { AnyFunction } from '@mds-core/mds-types'
import { ServiceErrorDescriptor, ServiceErrorDescriptorType, ServiceResponse } from '../@types'

export const isServiceError = <E extends string = ServiceErrorDescriptorType>(
  error: unknown,
  ...types: E[]
): error is ServiceErrorDescriptor<E> =>
  typeof error === 'object' &&
  error !== null &&
  (error as ServiceErrorDescriptor<E>).isServiceError === true &&
  (types.length === 0 || types.includes((error as ServiceErrorDescriptor<E>).type))

/** Will match an error of the specified type if it's thrown locally, or from a service */
export const isError = <E extends Error>(error: unknown, type: new () => E) =>
  error instanceof type || isServiceError(error, new type().name)

/** Create a function that will match an error of the specified if it's thrown locally, or from a service */
export const ErrorCheckFunction = <E extends Error>(type: new () => E) => {
  const { name } = new type()
  return (error: unknown) => error instanceof type || isServiceError(error, name)
}

// eslint-reason type inference requires any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceResponseMethod<R = any> = AnyFunction<Promise<ServiceResponse<R>>>

export const UnwrapServiceResult =
  <M extends ServiceResponseMethod>(method: M) =>
  async (...args: Parameters<M>): Promise<ReturnType<M> extends Promise<ServiceResponse<infer R>> ? R : never> => {
    const response = await method(...args)
    if (response.error) {
      throw response.error
    }
    return response.result
  }
