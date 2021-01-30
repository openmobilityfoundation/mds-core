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
import { TransactionStatusDomainModel } from '@mds-core/mds-transactions-backend/@types'
import { ApiRequestParams } from '@mds-core/mds-api-server'
import { ServerError } from '@mds-core/mds-utils'
import { TransactionApiRequest, TransactionApiResponse } from '../@types'

export type TransactionApiGetTransactionStatusesRequest = TransactionApiRequest & ApiRequestParams<'transaction_id'>

export type TransactionApiGetTransactionStatusesResponse = TransactionApiResponse<{
  statuses: TransactionStatusDomainModel[]
}>

export const GetTransactionStatusesHandler = async (
  req: TransactionApiGetTransactionStatusesRequest,
  res: TransactionApiGetTransactionStatusesResponse
) => {
  try {
    const { transaction_id } = req.params
    const statuses = await TransactionServiceClient.getTransactionStatuses(transaction_id)
    const { version } = res.locals
    return res.status(200).send({ version, statuses })
  } catch (error) {
    return res.status(500).send({ error: new ServerError(error) })
  }
}
