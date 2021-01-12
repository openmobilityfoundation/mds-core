import { TransactionServiceClient, TransactionDomainModel } from '@mds-core/mds-transactions-service'
import { isError } from '@mds-core/mds-service-helpers'
import { ApiRequestParams } from '@mds-core/mds-api-server'
import { NotFoundError, ServerError } from '@mds-core/mds-utils'
import { TransactionApiResponse, TransactionApiRequest } from '../@types'

export type TransactionApiGetTransactionRequest = TransactionApiRequest & ApiRequestParams<'id'>

export type TransactionApiGetTransactionResponse = TransactionApiResponse<{ transaction: TransactionDomainModel }>

export const GetTransactionHandler = async (
  req: TransactionApiGetTransactionRequest,
  res: TransactionApiGetTransactionResponse
) => {
  try {
    const { id } = req.params
    const transaction = await TransactionServiceClient.getTransaction(id)
    const { version } = res.locals
    return res.status(200).send({ version, transaction })
  } catch (error) {
    if (isError(error, NotFoundError)) {
      return res.status(404).send({ error })
    }
    return res.status(500).send({ error: new ServerError(error) })
  }
}
