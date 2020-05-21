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

import { AnyFunction } from '@mds-core/mds-types'

export const ServiceErrorDescriptorTypes = [
  'ServiceException',
  'NotFoundError',
  'ConflictError',
  'ValidationError'
] as const

export type ServiceErrorDescriptorType = typeof ServiceErrorDescriptorTypes[number]

export type ServiceErrorDescriptor<E extends string> = Readonly<{
  isServiceError: true
  type: E
  message: string
  details?: string
}>

export interface ServiceErrorType<E extends string = ServiceErrorDescriptorType> {
  error: ServiceErrorDescriptor<E>
}

export interface ServiceResultType<R> {
  error: null
  result: R
}

export type ServiceResponse<R> = ServiceErrorType | ServiceResultType<R>

export type ServiceClient<I> = {
  [P in keyof I]: I[P] extends AnyFunction<infer R> ? (...args: Parameters<I[P]>) => Promise<R> : never
}

export type ServiceProvider<I> = {
  [P in keyof I]: I[P] extends AnyFunction<infer R> ? (...args: Parameters<I[P]>) => Promise<ServiceResponse<R>> : never
}

export interface ProcessController {
  start: () => Promise<void>
  stop: () => Promise<void>
}
