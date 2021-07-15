import { uuid } from '@mds-core/mds-utils'
import { TransactionServiceClient } from '../client'
import { TransactionRepository } from '../repository'
import { TransactionServiceManager } from '../service/manager'
import { transactionStatusesGenerator } from '../test-fixtures'

const TransactionServer = TransactionServiceManager.controller()

describe('Transaction Status Tests', () => {
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

  describe('Success', () => {
    it('Post Good Transaction Status', async () => {
      const [transactionStatusToPersist] = transactionStatusesGenerator(1)
      const recordedTransactionStatus = await TransactionServiceClient.setTransactionStatus(transactionStatusToPersist)

      expect(recordedTransactionStatus.status_id).toEqual(transactionStatusToPersist.status_id)
      expect(recordedTransactionStatus.transaction_id).toEqual(recordedTransactionStatus.transaction_id)
    })

    it('Get Statuses for one Transaction', async () => {
      const [transactionStatusToPersist] = transactionStatusesGenerator(1)

      await TransactionServiceClient.setTransactionStatus(transactionStatusToPersist)

      const statuses = await TransactionServiceClient.getTransactionStatuses(transactionStatusToPersist.transaction_id)
      expect(statuses.length).toEqual(1)
      const [status] = statuses
      expect(status.status_id).toEqual(transactionStatusToPersist.status_id)
    })

    it('Get Statuses for many Transactions', async () => {
      const transaction_ids = Array.from({ length: 10 }, uuid)

      const transactionStatusesToPersist = transaction_ids
        .map(transaction_id => [...transactionStatusesGenerator(3, transaction_id)])
        .flat()

      await Promise.all(
        transactionStatusesToPersist.map(status => TransactionServiceClient.setTransactionStatus(status))
      )

      const statusMap = await TransactionServiceClient.getTransactionsStatuses(transaction_ids)

      expect(Object.keys(statusMap).length).toEqual(transaction_ids.length)

      Object.entries(statusMap).forEach(([transaction_id, transactionStatuses]) => {
        expect(transaction_ids).toContain(transaction_id)
        transactionStatuses.forEach(transactionStatus => {
          expect(transactionStatus.transaction_id).toStrictEqual(transaction_id)
        })
      })
    })
  })

  describe('Failure', () => {
    it('Get Transaction Statuses for One Nonexistent Transaction returns nothing', async () => {
      const statuses = await TransactionServiceClient.getTransactionStatuses(uuid())
      expect(statuses.length).toEqual(0)
    })

    it('Get Transaction Statuses for non-uuid transaction_id throws', async () => {
      await expect(TransactionServiceClient.getTransactionStatuses('potato')).rejects.toMatchObject({
        type: 'ValidationError'
      })
    })

    it('Get Transactions Statuses for non-uuid transaction_ids throw', async () => {
      await expect(TransactionServiceClient.getTransactionsStatuses(['potato'])).rejects.toMatchObject({
        type: 'ValidationError'
      })
    })

    it('Get Transactions Statuses for >100 transaction_ids', async () => {
      await expect(
        TransactionServiceClient.getTransactionsStatuses(Array.from({ length: 200 }, uuid))
      ).rejects.toMatchObject({
        type: 'ValidationError'
      })
    })
  })

  // TODO
  // search with non-existent-transaction-id
  // post dup stat id
  // post stat with missing fields
  // post stat with non-UUID
  // post stat with bad stat
  // post stat on non-existent transaction id

  afterAll(async () => {
    await Promise.all([
      TransactionRepository.deleteAllTransactions(),
      TransactionRepository.deleteAllTransactionOperations(),
      TransactionRepository.deleteAllTransactionStatuses()
    ])
    await TransactionServer.stop()
  })
})
