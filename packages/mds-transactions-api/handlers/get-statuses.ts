import { TransactionServiceClient } from '@mds-core/mds-transactions-service'
import { TransactionStatusDomainModel } from '@mds-core/mds-transactions-service/@types'
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
