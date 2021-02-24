/**
 * Copyright 2020 City of Los Angeles
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

import {
  TransactionServiceClient,
  TransactionDomainModel,
  PaginationLinks,
  SORTABLE_COLUMN,
  SORT_DIRECTION,
  TransactionSearchParams
} from '@mds-core/mds-transactions-service'
import { ApiRequestParams } from '@mds-core/mds-api-server'
import { parseRequest } from '@mds-core/mds-api-helpers'
import { ValidationError } from '@mds-core/mds-utils'
import express from 'express'
import { TransactionApiRequest, TransactionApiResponse } from '../@types'

export type TransactionApiGetTransactionsRequest = TransactionApiRequest &
  ApiRequestParams<'provider_id' | 'start_timestamp' | 'end_timestamp'>

export type TransactionApiGetTransactionsResponse = TransactionApiResponse<{
  transactions: TransactionDomainModel[]
  links: PaginationLinks
}>

const getOrderOption = (req: TransactionApiGetTransactionsRequest) => {
  const { order_column: column } = parseRequest(req)
    .single({
      parser: queryVal => {
        const isSortableColumn = (value: unknown): value is SORTABLE_COLUMN =>
          typeof value === 'string' && SORTABLE_COLUMN.includes(value as SORTABLE_COLUMN)

        if (queryVal) {
          if (isSortableColumn(queryVal)) {
            return queryVal
          }

          /**
           * If the param exists but is not a string or sortable column, throw a validation error
           */
          throw new ValidationError(`Invalid sortable column ${queryVal}`)
        }
      }
    })
    .query('order_column')

  const { order_direction: direction = 'ASC' } = parseRequest(req)
    .single({
      parser: queryVal => {
        const isDirection = (value: unknown): value is SORT_DIRECTION =>
          typeof queryVal === 'string' && SORT_DIRECTION.includes(value as SORT_DIRECTION)

        if (queryVal) {
          if (isDirection(queryVal)) {
            return queryVal
          }

          /**
           * If the param exists but is not a direction, throw a validation error
           */
          throw new ValidationError(`Invalid sort direction ${queryVal}`)
        }
      }
    })
    .query('order_direction')

  const order = column ? { column, direction } : undefined

  return order
}

/**
 * Construct URLs given search options & cursor location
 * @param req Express Request
 * @param param1 Search options & cursor location
 */
const constructUrls = (
  req: TransactionApiGetTransactionsRequest,
  { order, ...basicOptions }: TransactionSearchParams
) => {
  const url = new URL(`${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}${req.path}`)

  const basicOptionsUrls = Object.entries(basicOptions).reduce((urlParams, [key, val]) => {
    if (val) {
      const paramsTail = urlParams.slice(-1)

      if (paramsTail === '?') return `${urlParams}${key}=${val}`
      return `${urlParams}&${key}=${val}`
    }

    return urlParams
  }, `${url}?`)

  // We can do this because we're assured to have *something* in `basicOptionsUrls` if we're generating a page
  if (order) {
    return `${basicOptionsUrls}&order_column=${order.column}&order_direction=${order.direction}`
  }

  return basicOptionsUrls
}

export const GetTransactionsHandler = async (
  req: TransactionApiGetTransactionsRequest,
  res: TransactionApiGetTransactionsResponse,
  next: express.NextFunction
) => {
  try {
    const order = getOrderOption(req)
    const { provider_id, before, after } = parseRequest(req)
      .single({ parser: String })
      .query('provider_id', 'before', 'after')
    const { start_timestamp, end_timestamp, limit = 10 } = parseRequest(req)
      .single({ parser: Number })
      .query('start_timestamp', 'end_timestamp', 'limit')

    const { transactions, cursor } = await TransactionServiceClient.getTransactions({
      provider_id,
      before,
      after,
      start_timestamp,
      end_timestamp,
      order,
      limit
    })

    const { version } = res.locals

    const links: PaginationLinks = {
      prev: cursor.beforeCursor
        ? constructUrls(req, {
            order,
            provider_id,
            start_timestamp,
            end_timestamp,
            limit,
            before: cursor.beforeCursor
          })
        : null,
      next: cursor.afterCursor
        ? constructUrls(req, {
            order,
            provider_id,
            start_timestamp,
            end_timestamp,
            limit,
            after: cursor.afterCursor
          })
        : null
    }

    return res.status(200).send({ version, transactions, links })
  } catch (error) {
    next(error)
  }
}
