/*
    Copyright 2019 City of Los Angeles.

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

import { ApiRequest, ApiVersionedResponse, ApiVersionedResponseLocals } from '@mds-core/mds-api-server'
import { UUID } from '@mds-core/mds-types'
import { Params, ParamsDictionary } from 'express-serve-static-core'

export const NATIVE_API_SUPPORTED_VERSIONS = ['0.1.0'] as const
export type NATIVE_API_SUPPORTED_VERSION = typeof NATIVE_API_SUPPORTED_VERSIONS[number]
export const [NATIVE_API_DEFAULT_VERSION] = NATIVE_API_SUPPORTED_VERSIONS

// Allow adding type definitions for Express Request objects
export type NativeApiRequest<P extends Params = ParamsDictionary> = ApiRequest<P>

export interface NativeApiResponse<TBody extends {}> extends ApiVersionedResponse<NATIVE_API_SUPPORTED_VERSION, TBody> {
  locals: ApiVersionedResponseLocals<NATIVE_API_SUPPORTED_VERSION> & {
    provider_id: UUID
  }
}
