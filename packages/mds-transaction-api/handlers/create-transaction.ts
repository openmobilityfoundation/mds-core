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

import { TransactionDomainModel, TransactionServiceClient } from '@mds-core/mds-transaction-service'
import express from 'express'
import { TransactionApiRequest, TransactionApiResponse } from '../@types'

export type TransactionApiCreateTransactionRequest = TransactionApiRequest<TransactionDomainModel>

export type TransactionApiCreateTransactionResponse = TransactionApiResponse<{ transaction: TransactionDomainModel }>

export const CreateTransactionHandler = async (
  req: TransactionApiCreateTransactionRequest,
  res: TransactionApiCreateTransactionResponse,
  next: express.NextFunction
) => {
  try {
    const transaction = await TransactionServiceClient.createTransaction(req.body)
    const { version } = res.locals
    return res.status(201).send({ version, transaction })
  } catch (error) {
    next(error)
  }
}
