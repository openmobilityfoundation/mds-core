import { TransactionServiceClient, TransactionDomainModel } from '@mds-core/mds-transactions-service'
import { isError } from '@mds-core/mds-service-helpers'
import { ConflictError, ServerError, ValidationError } from '@mds-core/mds-utils'
import { TransactionApiRequest, TransactionApiResponse } from '../@types'

export type TransactionApiCreateTransactionsRequest = TransactionApiRequest<TransactionDomainModel[]>

export type TransactionApiCreateTransactionsResponse = TransactionApiResponse<{
  transactions: TransactionDomainModel[]
}>

// TODO consolidate with create single
export const CreateTransactionsHandler = async (
  req: TransactionApiCreateTransactionsRequest,
  res: TransactionApiCreateTransactionsResponse
) => {
  try {
    const transactions = await TransactionServiceClient.createTransactions(req.body)
    const { version } = res.locals
    return res.status(201).send({ version, transactions })
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
