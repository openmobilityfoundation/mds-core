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

import { TransactionServiceClient, TransactionDomainModel } from '@mds-core/mds-transaction-service'
import express from 'express'
import { TransactionApiRequest, TransactionApiResponse } from '../@types'

export type TransactionApiCreateTransactionsRequest = TransactionApiRequest<TransactionDomainModel[]>

export type TransactionApiCreateTransactionsResponse = TransactionApiResponse<{
  transactions: TransactionDomainModel[]
}>

// TODO consolidate with create single
export const CreateTransactionsHandler = async (
  req: TransactionApiCreateTransactionsRequest,
  res: TransactionApiCreateTransactionsResponse,
  next: express.NextFunction
) => {
  try {
    const transactions = await TransactionServiceClient.createTransactions(req.body)
    const { version } = res.locals
    return res.status(201).send({ version, transactions })
  } catch (error) {
    next(error)
  }
}
