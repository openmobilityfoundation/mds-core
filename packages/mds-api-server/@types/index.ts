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

import express from 'express'
import { AuthorizerClaims } from '@mds-core/mds-api-authorizer'

export type ApiRequest<B = {}> = express.Request<{}, unknown, B, {}>

/**
 * Type of request route/path parameters (req.params)
 * R: Required route parameter(s)
 * O: Optional route parameter(s)
 */
export type ApiRequestParams<R extends string, O extends string = never> = {
  params: { [P in R]: string } & Partial<{ [P in O]: string }>
}

/**
 * Type of request query parameters (res.query)
 * S: (Single) Query parameter expected to appear at most once
 * M: (Multiple) Query parameter that can appear 0 or more times
 */
export type ApiRequestQuery<S extends string, M extends string[] = never> = {
  query: Partial<{ [P in Exclude<S, M[number]>]: string }> & Partial<{ [P in M[number]]: string | string[] }>
}

/**
 * Standard format for API errors
 */
export type ApiError = { error: unknown; error_description?: string; error_details?: string[] } | { errors: unknown[] }

/**
 * B: Type of response body (res.send)
 */
export type ApiResponse<B = {}> = express.Response<B | ApiError>

/**
 * Extracts the body generic (B) for an APIResponse, in addition to possible error values.
 * Useful for frontend applications attempting to use the response payloads defined for Express.
 */
export type ExtractApiResponseBody<P> = P extends ApiResponse<infer T> ? T | ApiError : never

/**
 * P, T: Property name/type { [P]: T } added to response locals (res.locals)
 */
export type ApiResponseLocals<P extends string, T> = {
  locals: Record<P, T>
}

export type ApiResponseLocalsClaims<AccessTokenScope extends string = never> = ApiResponseLocals<
  'scopes',
  Array<AccessTokenScope>
> &
  ApiResponseLocals<'claims', AuthorizerClaims | null>

export type ApiResponseLocalsVersion<V extends string> = ApiResponseLocals<'version', V>

export type ApiVersionedResponse<V extends string, B = {}> = ApiResponse<B & { version: V }> &
  ApiResponseLocalsVersion<V>
