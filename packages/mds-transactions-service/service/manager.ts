import { RpcServer } from '@mds-core/mds-rpc-common'
import { TransactionServiceDefinition } from '../@types'
import { TransactionServiceClient } from '../client'
import { TransactionServiceProvider } from './provider'

export const TransactionServiceManager = RpcServer(
  TransactionServiceDefinition,
  {
    onStart: TransactionServiceProvider.start,
    onStop: TransactionServiceProvider.stop
  },
  {
    createTransaction: args => TransactionServiceProvider.createTransaction(...args),
    createTransactions: args => TransactionServiceProvider.createTransactions(...args),
    getTransaction: args => TransactionServiceProvider.getTransaction(...args),
    getTransactions: args => TransactionServiceProvider.getTransactions(...args),
    addTransactionOperation: args => TransactionServiceProvider.addTransactionOperation(...args),
    getTransactionOperations: args => TransactionServiceProvider.getTransactionOperations(...args),
    setTransactionStatus: args => TransactionServiceProvider.setTransactionStatus(...args),
    getTransactionStatuses: args => TransactionServiceProvider.getTransactionStatuses(...args)
  },
  {
    port: process.env.TRANSACTION_SERVICE_RPC_PORT,
    repl: {
      port: process.env.TRANSACTION_SERVICE_REPL_PORT,
      context: { client: TransactionServiceClient }
    }
  }
)
