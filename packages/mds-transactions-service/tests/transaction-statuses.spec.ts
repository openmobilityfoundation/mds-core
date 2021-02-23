import { uuid } from '@mds-core/mds-utils'
import { TransactionServiceManager } from '../service/manager'
import { TransactionServiceClient } from '../client'
import { TransactionRepository } from '../repository'
import { TransactionStatusDomainCreateModel } from '../@types'

function* transactionStatusesGenerator(length = 20): Generator<TransactionStatusDomainCreateModel> {
  const start_timestamp = Date.now() - length * 1000

  for (let i = 0; i < length; i++) {
    const timestamp = start_timestamp + i * 1000

    yield {
      transaction_id: uuid(),
      status_id: uuid(),
      timestamp,
      status_type: 'order_submitted',
      author: 'no one'
    }
  }
}

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

  it('Post Good Transaction Status', async () => {
    const [transactionStatusToPersist] = transactionStatusesGenerator(1)
    const recordedTransactionStatus = await TransactionServiceClient.setTransactionStatus(transactionStatusToPersist)

    expect(recordedTransactionStatus.status_id).toEqual(transactionStatusToPersist.status_id)
    expect(recordedTransactionStatus.transaction_id).toEqual(recordedTransactionStatus.transaction_id)
  })

  it('Get All Transaction Statuses', async () => {
    const [transactionStatusToPersist] = transactionStatusesGenerator(1)

    await TransactionServiceClient.setTransactionStatus(transactionStatusToPersist)

    const statuses = await TransactionServiceClient.getTransactionStatuses(transactionStatusToPersist.transaction_id)
    expect(statuses.length).toEqual(1)
    const [status] = statuses
    expect(status.status_id).toEqual(transactionStatusToPersist.status_id)
  })

  it('Get All Transaction Statuses for One Nonexistent Transaction', async () => {
    const statuses = await TransactionServiceClient.getTransactionStatuses(uuid())
    expect(statuses.length).toEqual(0)
  })

  // TODO
  // search with non-existent-transaction-id
  // post dup stat id
  // post stat with missing fields
  // post stat with non-UUID
  // post stat with bad stat
  // post stat on non-existaet transaction id

  afterAll(async () => {
    await Promise.all([
      TransactionRepository.deleteAllTransactions(),
      TransactionRepository.deleteAllTransactionOperations(),
      TransactionRepository.deleteAllTransactionStatuses()
    ])
    await TransactionServer.stop()
  })
})
