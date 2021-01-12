/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TransactionServiceManager } from '../service/manager'
import { TransactionServiceClient } from '../client'
import { TransactionRepository } from '../repository'

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

const device_id = 'ee6bf5c7-bce0-46c9-a5c9-8652724059d7'
const provider_id = '3452fa87-bfd7-42c5-9c53-5e07bde13671'
const unknown_provider_id = '654b106d-5706-495f-8c89-64e17a5a3ed8'
const transaction_id = '37bd96ac-69bd-4634-9b22-ff081d7a5a09'
const unknown_transaction_id = '822415eb-baaa-40ff-b219-a5ed214e2114'
const receipt_id = 'a5eb612e-a154-4339-a760-aee95908dc51'
const operation_id = '4fcbbd4f-c0cb-46b7-b7dd-55ebae535493'
const status_id = '15c99c65-cf78-46a9-9055-c9973e43f061'
const receipt = { receipt_id, timestamp: Date.now(), receipt_details: {}, origin_url: '' }

const malformed_uuid = '176b8453-ccaf-41c7-a4df-f7b3f80bddd1xxxxxxx'

describe('Transaction Service Tests', () => {
  beforeAll(async () => {
    await TransactionServer.start()
  })

  it('Post Good Transaction', async () => {
    const transaction = await TransactionServiceClient.createTransaction({
      transaction_id,
      provider_id,
      device_id,
      timestamp: Date.now(),
      amount: 100, // "I'd buy THAT for a dollar!"
      fee_type: 'base_fee',
      receipt
    })
    expect(transaction.device_id).toEqual(device_id)
    expect(transaction.transaction_id).toEqual(transaction_id)
  })

  it('Post Transaction with malformed transaction_id', async () => {
    try {
      await TransactionServiceClient.createTransaction({
        transaction_id: malformed_uuid,
        provider_id,
        device_id,
        timestamp: Date.now(),
        amount: 100, // "I'd buy THAT for a dollar!"
        fee_type: 'base_fee',
        receipt
      })
      expect('did not happen').toBe('happened')
    } catch (err) {
      expect(err.type).toBe('ValidationError')
    }
  })

  it('Post Transaction with missing fee_type', async () => {
    try {
      await TransactionServiceClient.createTransaction({
        transaction_id: malformed_uuid,
        provider_id,
        device_id,
        timestamp: Date.now(),
        amount: 100, // "I'd buy THAT for a dollar!"
        receipt
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      expect('did not happen').toBe('happened')
    } catch (err) {
      expect(err.type).toBe('ValidationError')
    }
  })

  it('Post Transaction duplicate transaction_id', async () => {
    try {
      await TransactionServiceClient.createTransaction({
        transaction_id,
        provider_id,
        device_id,
        timestamp: Date.now(),
        amount: 100, // "I'd buy THAT for a dollar!"
        fee_type: 'base_fee',
        receipt
      })
      expect('did not happen').toBe('happened')
    } catch (err) {
      expect(err.type).toBe('ConflictError')
    }
  })

  it('Get All Transactions', async () => {
    const transactions = await TransactionServiceClient.getTransactions({})
    expect(transactions.length).toEqual(1)
    const [transaction] = transactions
    expect(transaction.transaction_id).toEqual(transaction_id)
  })

  it('Get All Transactions with provider serach', async () => {
    const transactions = await TransactionServiceClient.getTransactions({ provider_id })
    expect(transactions.length).toEqual(1)
    const [transaction] = transactions
    expect(transaction.transaction_id).toEqual(transaction_id)
  })

  it('Get All Transactions with bogus provider serach', async () => {
    const transactions = await TransactionServiceClient.getTransactions({ provider_id: unknown_provider_id })
    expect(transactions.length).toEqual(0)
  })

  it('Get One Transaction', async () => {
    const transaction = await TransactionServiceClient.getTransaction(transaction_id)
    expect(transaction.transaction_id).toEqual(transaction_id)
  })

  // operations
  it('Post Good Transaction Operation', async () => {
    const operation = await TransactionServiceClient.addTransactionOperation({
      transaction_id,
      operation_id,
      timestamp: Date.now(),
      operation_type: 'invoice_generated',
      author: 'no one'
    })
    expect(operation.operation_id).toEqual(operation_id)
    expect(operation.transaction_id).toEqual(transaction_id)
  })

  // post dup op id
  it('Post Duplicate Transaction Operation', async () => {
    try {
      await TransactionServiceClient.addTransactionOperation({
        transaction_id,
        operation_id,
        timestamp: Date.now(),
        operation_type: 'invoice_generated',
        author: 'no one'
      })
      expect('did not happen').toBe('happened')
    } catch (err) {
      expect(err.type).toBe('ConflictError')
    }
  })

  it('Get All Transaction Operations for One Transaction', async () => {
    const operations = await TransactionServiceClient.getTransactionOperations(transaction_id)
    expect(operations.length).toEqual(1)
    const [operation] = operations
    expect(operation.operation_id).toEqual(operation_id)
  })

  it('Get All Transaction Operations for One Nonexistant Transaction', async () => {
    const operations = await TransactionServiceClient.getTransactionOperations(unknown_transaction_id)
    expect(operations.length).toEqual(0)
  })

  // search with non-existant-transaction-id

  // post op with missing fields
  // post op with bad op
  // post op with non-UUID
  // post op on non-existant transaction id

  // status
  // operations
  it('Post Good Transaction Status', async () => {
    const operation = await TransactionServiceClient.setTransactionStatus({
      transaction_id,
      status_id,
      timestamp: Date.now(),
      status_type: 'invoice_generated',
      author: 'no one'
    })
    expect(operation.status_id).toEqual(status_id)
    expect(operation.transaction_id).toEqual(transaction_id)
  })

  it('Get All Transaction Statuses', async () => {
    const statuses = await TransactionServiceClient.getTransactionStatuses(transaction_id)
    expect(statuses.length).toEqual(1)
    const [status] = statuses
    expect(status.status_id).toEqual(status_id)
  })

  it('Get All Transaction Statuses for One Nonexistant Transaction', async () => {
    const statuses = await TransactionServiceClient.getTransactionStatuses(unknown_transaction_id)
    expect(statuses.length).toEqual(0)
  })

  // search with non-existant-transaction-id

  // post dup stat id
  // post stat with missing fields
  // post stat with non-UUID
  // post stat with bad stat
  // post stat on non-existant transaction id

  afterAll(async () => {
    await TransactionServer.stop()
  })
})
