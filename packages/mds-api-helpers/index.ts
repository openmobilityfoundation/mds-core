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

import urls from 'url'
import { ApiRequest } from '@mds-core/mds-api-server'
import {
  parseObjectPropertiesList,
  parseObjectPropertiesSingle,
  ParseObjectPropertiesOptionsSingle,
  ParseObjectPropertiesOptionsList
} from './object-properties-parser'

const jsonApiLink = (req: ApiRequest, skip: number, take: number): string =>
  urls.format({
    protocol: req.get('x-forwarded-proto') || req.protocol,
    host: req.get('host'),
    pathname: req.path,
    query: { ...req.query, skip, take }
  })

export type JsonApiLinks = Partial<{ first: string; prev: string; next: string; last: string }> | undefined

export const asJsonApiLinks = (req: ApiRequest, skip: number, take: number, count: number): JsonApiLinks => {
  if (skip > 0 || take < count) {
    const first = skip > 0 ? jsonApiLink(req, 0, take) : undefined
    const prev = skip - take >= 0 && skip - take < count ? jsonApiLink(req, skip - take, take) : undefined
    const next = skip + take < count ? jsonApiLink(req, skip + take, take) : undefined
    const last = skip + take < count ? jsonApiLink(req, count - (count % take || take), take) : undefined
    return { first, prev, next, last }
  }
  return undefined
}

/** parseRequest
 * Takes an API request, and returns two clients:
 * - single: takes an optional parser that applies to a single value,
 * and will return single values, e.g. string, number.
 *
 * - list: takes an optional parser that applies to a list of values,
 * and will return a list of values, e.g. string[], number[], Foo[].
 * @example parseRequest(req).single({ parser: Number }).query('skip', 'take')
 * @example parseRequest(req).list({ parser: xs => { xs.filter(isUUID) }}).query('provider_id')
 */
export const parseRequest = (req: ApiRequest) => ({
  single: <T = string>(options?: ParseObjectPropertiesOptionsSingle<T>) => ({
    query: parseObjectPropertiesSingle<T>(req.query, options).keys,
    params: parseObjectPropertiesSingle<T>(req.params, options).keys
  }),
  list: <T = string>(options?: ParseObjectPropertiesOptionsList<T>) => ({
    query: parseObjectPropertiesList<T>(req.query, options).keys,
    params: parseObjectPropertiesList<T>(req.params, options).keys
  })
})

export const parsePagingQueryParams = (req: ApiRequest) => {
  const [DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE] = [100, 1000]
  const { skip = 0, take = DEFAULT_PAGE_SIZE } = parseRequest(req).single({ parser: Number }).query('skip', 'take')
  return {
    skip: Number.isNaN(skip) ? 0 : Math.max(0, skip),
    take: Number.isNaN(take) ? DEFAULT_PAGE_SIZE : Math.min(take, MAX_PAGE_SIZE)
  }
}
