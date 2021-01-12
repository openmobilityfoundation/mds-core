import { TransactionServiceClient } from '@mds-core/mds-transactions-service'
import { TransactionOperationDomainModel } from '@mds-core/mds-transactions-service/@types'
import { ApiRequestParams } from '@mds-core/mds-api-server'
import { ServerError } from '@mds-core/mds-utils'
import { TransactionApiRequest, TransactionApiResponse } from '../@types'

export type TransactionApiGetTransactionOperationsRequest = TransactionApiRequest & ApiRequestParams<'transaction_id'>

export type TransactionApiGetTransactionOperationsResponse = TransactionApiResponse<{
  operations: TransactionOperationDomainModel[]
}>

export const GetTransactionOperationsHandler = async (
  req: TransactionApiGetTransactionOperationsRequest,
  res: TransactionApiGetTransactionOperationsResponse
) => {
  try {
    const { transaction_id } = req.params
    const operations = await TransactionServiceClient.getTransactionOperations(transaction_id)
    const { version } = res.locals
    return res.status(200).send({ version, operations })
  } catch (error) {
    return res.status(500).send({ error: new ServerError(error) })
  }
}
