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

import { TransactionServiceClient, TransactionDomainModel } from '@mds-core/mds-transactions-backend'
import { ApiRequestParams } from '@mds-core/mds-api-server'
import { parseRequest } from '@mds-core/mds-api-helpers'
import { ServerError } from '@mds-core/mds-utils'
import { TransactionApiRequest, TransactionApiResponse } from '../@types'

export type TransactionApiGetTransactionsRequest = TransactionApiRequest &
  ApiRequestParams<'provider_id' | 'start_timestamp' | 'end_timestamp'>

export type TransactionApiGetTransactionsResponse = TransactionApiResponse<{ transactions: TransactionDomainModel[] }>

export const GetTransactionsHandler = async (
  req: TransactionApiGetTransactionsRequest,
  res: TransactionApiGetTransactionsResponse
) => {
  try {
    const transactions = await TransactionServiceClient.getTransactions({
      ...parseRequest(req).single({ parser: String }).query('provider_id'),
      ...parseRequest(req).single({ parser: Number }).query('start_timestamp', 'end_timestamp')
    })
    const { version } = res.locals
    return res.status(200).send({ version, transactions })
  } catch (error) {
    return res.status(500).send({ error: new ServerError(error) })
  }
}
