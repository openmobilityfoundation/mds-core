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

import { uuid } from '@mds-core/mds-utils'
import { TransactionServiceManager } from '../service/manager'
import { TransactionServiceClient } from '../client'
import { TransactionRepository } from '../repository'
import { TransactionDomainModel } from '../@types'
import { transactionsGenerator } from '../test-fixtures'

describe('Transaction Repository Tests', () => {
  beforeAll(async () => {
    await TransactionRepository.initialize()
  })

  it('Run Migrations', async () => {
    await TransactionRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await TransactionRepository.revertAllMigrations()
  })

  afterAll(async () => {
    await TransactionRepository.shutdown()
  })
})

const TransactionServer = TransactionServiceManager.controller()

describe('Transaction Service Tests', () => {
  beforeAll(async () => {
    await TransactionServer.start()
  })

  /**
   * Clear DB after each test runs, and after the file is finished. No side-effects for you.
   */
  beforeEach(async () => {
    await Promise.all([
      TransactionRepository.deleteAllTransactions(),
      TransactionRepository.deleteAllTransactionOperations(),
      TransactionRepository.deleteAllTransactionStatuses()
    ])
  })

  describe('Transaction Tests', () => {
    describe('Transaction Creation Tests', () => {
      describe('Success Tests', () => {
        it('Create one good transaction succeeds', async () => {
          const [transactionToPersist] = transactionsGenerator()

          const recordedTransaction = await TransactionServiceClient.createTransaction(transactionToPersist)
          expect(recordedTransaction.device_id).toEqual(transactionToPersist.device_id)
          expect(recordedTransaction.transaction_id).toEqual(transactionToPersist.transaction_id)
        })

        it('Verifies good bulk-transaction creation', async () => {
          const transactionsToPersist = [...transactionsGenerator(20)]
          const recordedTransactions = await TransactionServiceClient.createTransactions(transactionsToPersist)

          recordedTransactions.forEach((transaction, i) => {
            expect(transaction.device_id).toEqual(transactionsToPersist[i].device_id)
          })

          expect(recordedTransactions.length).toStrictEqual(transactionsToPersist.length)
        })
      })

      describe('Failure Tests', () => {
        it('Create one transaction with malformed transaction_id rejects', async () => {
          const [transaction] = transactionsGenerator(1)
          const malformedTransaction = { ...transaction, transaction_id: 'definitely-not-a-uuid' }

          await expect(TransactionServiceClient.createTransaction(malformedTransaction)).rejects.toMatchObject({
            type: 'ValidationError'
          })
        })

        it('Create one transaction with missing fee_type rejects', async () => {
          const [transaction] = transactionsGenerator(1)
          const { fee_type, ...malformedTransaction } = transaction

          await expect(TransactionServiceClient.createTransaction(malformedTransaction as any)).rejects.toMatchObject({
            type: 'ValidationError'
          })
        })

        it('Post Transaction duplicate transaction_id', async () => {
          const [transaction] = transactionsGenerator(1)

          await TransactionServiceClient.createTransaction(transaction)

          await expect(TransactionServiceClient.createTransaction(transaction)).rejects.toMatchObject({
            type: 'ConflictError'
          })
        })
      })
    })

    describe('Transaction Read Tests', () => {
      describe('Success', () => {
        it('Get One Transaction', async () => {
          const [transactionToPersist] = transactionsGenerator(1)
          const recordedTransaction = await TransactionServiceClient.createTransaction(transactionToPersist)

          const fetchedTransaction = await TransactionServiceClient.getTransaction(recordedTransaction.transaction_id)
          expect(fetchedTransaction).toStrictEqual(recordedTransaction)
        })

        it('Verifies that get all transactions with no options uses the default limit', async () => {
          // We'll just generate a bunch of transactions here to test
          const transactionsToPersist = [...transactionsGenerator(100)]
          await TransactionServiceClient.createTransactions(transactionsToPersist)

          const { transactions } = await TransactionServiceClient.getTransactions({})
          expect(transactions.length).toEqual(10)
        })

        it('Get Bulk Transactions with provider search and default paging', async () => {
          const provider_id = uuid()
          const transactionsToPersist = [...transactionsGenerator(21, { provider_id })] // Arbitrarily generate 21 events, just so we can verify paging works w/ default page size on a handful of pages.
          await TransactionServiceClient.createTransactions(transactionsToPersist)

          const { transactions: firstPage, cursor: firstCursor } = await TransactionServiceClient.getTransactions({
            provider_id
          })
          expect(firstPage.length).toEqual(10) // default page size

          const { transactions: secondPage, cursor: secondCursor } = await TransactionServiceClient.getTransactions({
            provider_id,
            after: firstCursor.afterCursor ?? undefined
          })
          expect(secondPage.length).toEqual(10) // default page size

          const { transactions: lastPage } = await TransactionServiceClient.getTransactions({
            provider_id,
            after: secondCursor.afterCursor ?? undefined
          })
          expect(lastPage.length).toEqual(1) // default page size
        })

        it('Get Bulk Transactions with custom limit paging', async () => {
          const limit = 100

          const transactionsToPersist = [...transactionsGenerator(201)] // Arbitrarily generate 201 events
          await TransactionServiceClient.createTransactions(transactionsToPersist)

          const { transactions: firstPage, cursor: firstCursor } = await TransactionServiceClient.getTransactions({
            limit
          })
          expect(firstPage.length).toEqual(100) // custom page size

          const { transactions: secondPage, cursor: secondCursor } = await TransactionServiceClient.getTransactions({
            limit,
            after: firstCursor.afterCursor ?? undefined
          })
          expect(secondPage.length).toEqual(100) // custom page size

          const { transactions: lastPage } = await TransactionServiceClient.getTransactions({
            limit,
            after: secondCursor.afterCursor ?? undefined
          })
          expect(lastPage.length).toEqual(1) // last page, so lower than custom page size
        })

        it('Get Bulk Transactions within a time range, with default paging', async () => {
          const [start_timestamp, end_timestamp] = [100_000, 200_000] // Garbage arbitrary timestamps

          /**
           * Will generate transactions with differing timestamps **WITHIN** our time bounds, like 100_000, 100_001, 100_002, ..., 100_014
           */
          const inBoundsTransactions = [...transactionsGenerator(15)].map((transaction, i) => ({
            ...transaction,
            timestamp: start_timestamp + i
          }))
          /**
           * Will Generate transactions **OUTSIDE** of our time bounds, like 200_001, 200_001, ..., 200_0014
           */
          const outOfBoundsTransactions = [...transactionsGenerator(15)].map((transaction, i) => ({
            ...transaction,
            timestamp: end_timestamp + 1 + i
          }))
          const transactionsToPersist = [...inBoundsTransactions, ...outOfBoundsTransactions]
          await TransactionServiceClient.createTransactions(transactionsToPersist)

          const { transactions: firstPage, cursor: firstCursor } = await TransactionServiceClient.getTransactions({
            start_timestamp,
            end_timestamp
          })
          expect(firstPage.length).toEqual(10) // default page size
          firstPage.forEach(({ timestamp }) => {
            expect(timestamp).toBeGreaterThanOrEqual(start_timestamp)
            expect(timestamp).toBeLessThanOrEqual(end_timestamp)
          })

          const { transactions: secondPage } = await TransactionServiceClient.getTransactions({
            start_timestamp,
            end_timestamp,
            after: firstCursor.afterCursor ?? undefined
          })
          expect(secondPage.length).toEqual(5)
          secondPage.forEach(({ timestamp }) => {
            expect(timestamp).toBeGreaterThanOrEqual(start_timestamp)
            expect(timestamp).toBeLessThanOrEqual(end_timestamp)
          })
        })

        it('Get Bulk Transactions with sort options, with default paging', async () => {
          const transactionsToPersist = [...transactionsGenerator(20)]
          await TransactionServiceClient.createTransactions(transactionsToPersist)

          const { transactions: firstPage, cursor: firstCursor } = await TransactionServiceClient.getTransactions({
            order: {
              column: 'timestamp',
              direction: 'DESC'
            }
          })

          firstPage.reduce<TransactionDomainModel | undefined>((prevTransaction, currTransaction) => {
            if (prevTransaction) {
              const { timestamp: prevTimestamp } = prevTransaction
              const { timestamp: currTimestamp } = currTransaction
              expect(currTimestamp).toBeLessThanOrEqual(prevTimestamp)
            }

            return currTransaction
          }, undefined)

          const { transactions: secondPage } = await TransactionServiceClient.getTransactions({
            after: firstCursor.afterCursor ?? undefined,
            order: {
              column: 'timestamp',
              direction: 'DESC'
            }
          })

          secondPage.reduce<TransactionDomainModel | undefined>((prevTransaction, currTransaction) => {
            if (prevTransaction) {
              const { timestamp: prevTimestamp } = prevTransaction
              const { timestamp: currTimestamp } = currTransaction
              expect(currTimestamp).toBeLessThanOrEqual(prevTimestamp)
            }

            return currTransaction
          }, undefined)
        })
      })

      describe('Failure', () => {
        it('Verify that asking for too many items will fail (i.e. is Joi doing its job)', async () => {
          await expect(TransactionServiceClient.getTransactions({ limit: 10000 })).rejects.toMatchObject({
            type: 'ValidationError'
          })
        })

        it('Get All Transactions with bogus provider serach', async () => {
          const { transactions } = await TransactionServiceClient.getTransactions({
            provider_id: uuid()
          })
          expect(transactions.length).toEqual(0)
        })
      })
    })
  })

  afterAll(async () => {
    await Promise.all([
      TransactionRepository.deleteAllTransactions(),
      TransactionRepository.deleteAllTransactionOperations(),
      TransactionRepository.deleteAllTransactionStatuses()
    ])
    await TransactionServer.stop()
  })
})
