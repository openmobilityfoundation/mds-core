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
    getTransactionStatuses: args => TransactionServiceProvider.getTransactionStatuses(...args),
    getTransactionsStatuses: args => TransactionServiceProvider.getTransactionsStatuses(...args)
  },
  {
    port: process.env.TRANSACTION_SERVICE_RPC_PORT,
    repl: {
      port: process.env.TRANSACTION_SERVICE_REPL_PORT,
      context: { client: TransactionServiceClient }
    }
  }
)
