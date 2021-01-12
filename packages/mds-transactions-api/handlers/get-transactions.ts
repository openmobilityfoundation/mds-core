import { TransactionServiceClient, TransactionDomainModel } from '@mds-core/mds-transactions-service'
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
