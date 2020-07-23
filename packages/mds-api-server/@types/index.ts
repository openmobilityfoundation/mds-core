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
 * B: Type of response body (res.send)
 */
export type ApiResponse<B = {}> = Omit<
  express.Response<
    B | { error: unknown; error_description?: string; error_details?: string[] } | { errors: unknown[] }
  >,
  'locals'
> & { locals: unknown }

/**
 * L: Type of response locals (res.locals)
 */
export type ApiResponseLocals<L> = {
  locals: L
}

export type ApiClaims<AccessTokenScope extends string> = {
  claims: AuthorizerClaims | null
  scopes: AccessTokenScope[]
}

export type ApiVersion<V extends string> = { version: V }

export type ApiVersionedResponse<V extends string, B = {}> = ApiResponse<B & ApiVersion<V>> &
  ApiResponseLocals<ApiVersion<V>>
