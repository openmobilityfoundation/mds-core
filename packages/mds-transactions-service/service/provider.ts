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

import logger from '@mds-core/mds-logger'
import { ServiceResult, ServiceException, ServiceProvider, ProcessController } from '@mds-core/mds-service-helpers'
import { UUID } from '@mds-core/mds-types'
import { TransactionSearchParams, TransactionService } from '../@types'
import { TransactionRepository } from '../repository'
import {
  validateTransactionDomainModel,
  validateTransactionOperationDomainModel,
  validateTransactionStatusDomainModel
} from './validators'

export const TransactionServiceProvider: ServiceProvider<TransactionService> & ProcessController = {
  start: TransactionRepository.initialize,
  stop: TransactionRepository.shutdown,
  createTransaction: async transaction => {
    try {
      return ServiceResult(await TransactionRepository.createTransaction(validateTransactionDomainModel(transaction)))
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Creating Transaction', error)
      logger.error(exception, error)
      return exception
    }
  },
  createTransactions: async transactions => {
    try {
      return ServiceResult(
        await TransactionRepository.createTransactions(transactions.map(validateTransactionDomainModel))
      )
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Creating Transactions', error)
      logger.error(exception, error)
      return exception
    }
  },
  getTransaction: async (transaction_id: UUID) => {
    try {
      const transaction = await TransactionRepository.getTransaction(transaction_id)
      return ServiceResult(transaction)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException(`Error Getting Transaction: ${transaction_id}`, error)
      logger.error(exception, error)
      return exception
    }
  },
  // TODO search params
  getTransactions: async (search: TransactionSearchParams) => {
    try {
      const transactions = await TransactionRepository.getTransactions(search)
      return ServiceResult(transactions)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Getting Transactions', error)
      logger.error(exception, error)
      return exception
    }
  },
  addTransactionOperation: async transactionOperation => {
    try {
      const operation = await TransactionRepository.addTransactionOperation(
        validateTransactionOperationDomainModel(transactionOperation)
      )
      return ServiceResult(operation)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Creating Transaction Operation', error)
      logger.error(exception, error)
      return exception
    }
  },
  // TODO search params
  getTransactionOperations: async (transaction_id: UUID) => {
    try {
      const operations = await TransactionRepository.getTransactionOperations(transaction_id)
      return ServiceResult(operations)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Getting Transaction Operations', error)
      logger.error(exception, error)
      return exception
    }
  },
  setTransactionStatus: async transactionStatus => {
    try {
      const status = await TransactionRepository.setTransactionStatus(
        validateTransactionStatusDomainModel(transactionStatus)
      )
      return ServiceResult(status)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Creating Transaction Status', error)
      logger.error(exception, error)
      return exception
    }
  },
  // TODO search params
  getTransactionStatuses: async (transaction_id: UUID) => {
    try {
      const statuses = await TransactionRepository.getTransactionStatuses(transaction_id)
      return ServiceResult(statuses)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Getting Transaction Operations', error)
      logger.error(exception, error)
      return exception
    }
  }
}
