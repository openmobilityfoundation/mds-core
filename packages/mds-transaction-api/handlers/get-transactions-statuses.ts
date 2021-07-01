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

import { parseRequest } from '@mds-core/mds-api-helpers'
import { ApiRequestQuery } from '@mds-core/mds-api-server'
import { TransactionServiceClient } from '@mds-core/mds-transaction-service'
import { TransactionStatusDomainModel } from '@mds-core/mds-transaction-service/@types'
import { UUID } from '@mds-core/mds-types'
import { isUUID, ValidationError } from '@mds-core/mds-utils'
import express from 'express'
import { TransactionApiRequest, TransactionApiResponse } from '../@types'

export type TransactionApiGetTransactionsStatusesRequest = TransactionApiRequest & ApiRequestQuery<'transaction_id'>

export type TransactionApiGetTransactionsStatusesResponse = TransactionApiResponse<{
  statuses: Record<UUID, TransactionStatusDomainModel[]>
}>

export const GetTransactionsStatusesHandler = async (
  req: TransactionApiGetTransactionsStatusesRequest,
  res: TransactionApiGetTransactionsStatusesResponse,
  next: express.NextFunction
) => {
  try {
    const { transaction_id: transaction_ids } = parseRequest(req)
      .list({
        parser: vals => vals.filter(isUUID)
      })
      .query('transaction_id')

    if (!transaction_ids || transaction_ids.length === 0) {
      throw new ValidationError(`Must provide valid transaction_ids, query provided: ${req.query.transaction_id}`)
    }

    const statuses = await TransactionServiceClient.getTransactionsStatuses(transaction_ids)
    const { version } = res.locals
    return res.status(200).send({ version, statuses })
  } catch (error) {
    next(error)
  }
}
