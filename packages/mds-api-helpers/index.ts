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
import { parseObjectProperties, ParseObjectPropertiesOptions } from '@mds-core/mds-utils'
import { ApiRequest } from '@mds-core/mds-api-server'

interface PagingParams {
  skip: number
  take: number
}

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

export const parseRequest = <T = string>(req: ApiRequest, options?: ParseObjectPropertiesOptions<T>) => {
  const { keys: query } = parseObjectProperties<T>(req.query, options)
  const { keys: params } = parseObjectProperties<T>(req.params, options)
  return { params, query }
}

export const parsePagingQueryParams = (req: ApiRequest) => {
  const [DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE] = [100, 1000]
  const {
    skip: [skip = 0],
    take: [take = DEFAULT_PAGE_SIZE]
  } = parseRequest(req, { parser: Number }).query('skip', 'take')
  return {
    skip: Number.isNaN(skip) ? 0 : Math.max(0, skip),
    take: Number.isNaN(take) ? DEFAULT_PAGE_SIZE : Math.min(take, MAX_PAGE_SIZE)
  }
}
