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

import { ServiceClient } from '@mds-core/mds-backend-helpers'
import { RpcClient, RpcRequest } from '@mds-core/mds-rpc-common'
import { TransactionService, TransactionServiceDefinition } from '../@types'

const TransactionServiceRpcClient = RpcClient(TransactionServiceDefinition, {
  host: process.env.TRANSACTIONS_SERVICE_RPC_HOST,
  port: process.env.MTRANSACTION_SERVICE_RPC_PORT
})

// What the API layer, and any other clients, will invoke.
export const TransactionServiceClient: ServiceClient<TransactionService> = {
  createTransaction: (...args) => RpcRequest(TransactionServiceRpcClient.createTransaction, args),
  createTransactions: (...args) => RpcRequest(TransactionServiceRpcClient.createTransactions, args),
  getTransaction: (...args) => RpcRequest(TransactionServiceRpcClient.getTransaction, args),
  getTransactions: (...args) => RpcRequest(TransactionServiceRpcClient.getTransactions, args),
  addTransactionOperation: (...args) => RpcRequest(TransactionServiceRpcClient.addTransactionOperation, args),
  getTransactionOperations: (...args) => RpcRequest(TransactionServiceRpcClient.getTransactionOperations, args),
  setTransactionStatus: (...args) => RpcRequest(TransactionServiceRpcClient.setTransactionStatus, args),
  getTransactionStatuses: (...args) => RpcRequest(TransactionServiceRpcClient.getTransactionStatuses, args)
}
