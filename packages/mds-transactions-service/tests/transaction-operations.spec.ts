import { uuid } from '@mds-core/mds-utils'
import { TransactionServiceManager } from '../service/manager'
import { TransactionServiceClient } from '../client'
import { TransactionRepository } from '../repository'
import { TransactionOperationDomainCreateModel } from '../@types'

function* transactionOperationsGenerator(length = 20): Generator<TransactionOperationDomainCreateModel> {
  const start_timestamp = Date.now() - length * 1000

  for (let i = 0; i < length; i++) {
    const timestamp = start_timestamp + i * 1000

    yield {
      transaction_id: uuid(),
      operation_id: uuid(),
      timestamp,
      operation_type: 'invoice_generated',
      author: 'no one'
    }
  }
}

const TransactionServer = TransactionServiceManager.controller()

describe('Transaction Operation Tests', () => {
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

  const [sampleOperation] = transactionOperationsGenerator(1)
  const { operation_id, transaction_id } = sampleOperation

  describe('Transaction Operation Create Tests', () => {
    describe('Success', () => {
      it('Post Good Transaction Operation', async () => {
        const operation = await TransactionServiceClient.addTransactionOperation(sampleOperation)
        expect(operation.operation_id).toEqual(operation_id)
        expect(operation.transaction_id).toEqual(transaction_id)
      })
    })

    describe('Failure', () => {
      it('Post Duplicate Transaction Operation', async () => {
        await TransactionServiceClient.addTransactionOperation(sampleOperation)

        await expect(TransactionServiceClient.addTransactionOperation(sampleOperation)).rejects.toMatchObject({
          type: 'ConflictError'
        })
      })
    })
  })

  describe('Transaction Operation Read Tests', () => {
    it('Get All Transaction Operations for One Transaction', async () => {
      await TransactionServiceClient.addTransactionOperation(sampleOperation)

      const operations = await TransactionServiceClient.getTransactionOperations(sampleOperation.transaction_id)
      expect(operations.length).toEqual(1)
      const [operation] = operations
      expect(operation.operation_id).toEqual(operation_id)
    })

    it('Get All Transaction Operations for One Nonexistent Transaction', async () => {
      await TransactionServiceClient.addTransactionOperation(sampleOperation)

      const operations = await TransactionServiceClient.getTransactionOperations(uuid())
      expect(operations.length).toEqual(0)
    })
  })

  // search with non-existent-transaction-id

  // post op with missing fields
  // post op with bad op
  // post op with non-UUID
  // post op on non-existent transaction id

  afterAll(async () => {
    await Promise.all([
      TransactionRepository.deleteAllTransactions(),
      TransactionRepository.deleteAllTransactionOperations(),
      TransactionRepository.deleteAllTransactionStatuses()
    ])
    await TransactionServer.stop()
  })
})
