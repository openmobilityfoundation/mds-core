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

import { TransactionServiceClient } from '@mds-core/mds-transactions-backend'
import { isError } from '@mds-core/mds-backend-helpers'
import { TransactionOperationDomainModel } from '@mds-core/mds-transactions-backend/@types'
import { ConflictError, ServerError, ValidationError } from '@mds-core/mds-utils'
import { TransactionApiRequest, TransactionApiResponse } from '../@types'

export type TransactionApiAddTransactionOperationRequest = TransactionApiRequest<TransactionOperationDomainModel>

export type TransactionApiAddTransactionOperationResponse = TransactionApiResponse<{
  transaction: TransactionOperationDomainModel
}>

export const AddTransactionOperationHandler = async (
  req: TransactionApiAddTransactionOperationRequest,
  res: TransactionApiAddTransactionOperationResponse
) => {
  try {
    const transaction = await TransactionServiceClient.addTransactionOperation(req.body)
    const { version } = res.locals
    return res.status(201).send({ version, transaction })
  } catch (error) {
    if (isError(error, ValidationError)) {
      return res.status(400).send({ error })
    }
    if (isError(error, ConflictError)) {
      return res.status(409).send({ error })
    }
    return res.status(500).send({ error: new ServerError(error) })
  }
}
