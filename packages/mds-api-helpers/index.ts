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
import express from 'express'
import { parseObjectProperties } from '@mds-core/mds-utils'

interface PagingParams {
  skip: number
  take: number
}

export const asPagingParams: <T extends Partial<{ [P in keyof PagingParams]: unknown }>>(
  params: T
) => T & PagingParams = params => {
  const [DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE] = [100, 1000]
  const [skip, take] = [params.skip, params.take].map(Number)
  return {
    ...params,
    skip: Number.isNaN(skip) || skip <= 0 ? 0 : skip,
    take: Number.isNaN(take) || take <= 0 ? DEFAULT_PAGE_SIZE : Math.min(take, MAX_PAGE_SIZE)
  }
}

const jsonApiLink = (req: express.Request, skip: number, take: number): string =>
  urls.format({
    protocol: req.get('x-forwarded-proto') || req.protocol,
    host: req.get('host'),
    pathname: req.path,
    query: { ...req.query, skip, take }
  })

export type JsonApiLinks = Partial<{ first: string; prev: string; next: string; last: string }> | undefined

export const asJsonApiLinks = (req: express.Request, skip: number, take: number, count: number): JsonApiLinks => {
  if (skip > 0 || take < count) {
    const first = skip > 0 ? jsonApiLink(req, 0, take) : undefined
    const prev = skip - take >= 0 && skip - take < count ? jsonApiLink(req, skip - take, take) : undefined
    const next = skip + take < count ? jsonApiLink(req, skip + take, take) : undefined
    const last = skip + take < count ? jsonApiLink(req, count - (count % take || take), take) : undefined
    return { first, prev, next, last }
  }
  return undefined
}

export const parseRequest = <T = string>(req: express.Request, parser?: (value: string) => T) => {
  const { keys: query } = parseObjectProperties<T>(req.query, parser)
  const { keys: params } = parseObjectProperties<T>(req.params, parser)
  return { params, query }
}
