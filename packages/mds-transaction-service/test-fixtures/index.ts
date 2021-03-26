import { UUID } from '@mds-core/mds-types'
import { uuid } from '@mds-core/mds-utils'
import {
  TransactionDomainModel,
  TransactionStatusDomainModel,
  TransactionOperationDomainCreateModel,
  FEE_TYPE
} from '../@types'

const receipt = { receipt_id: uuid(), timestamp: Date.now(), receipt_details: {}, origin_url: '' }

/**
 * Generator for Transactions.
 * @param length How many transactions to generate
 */
export function* transactionsGenerator(
  length = 20,
  options: { provider_id?: UUID; receipt_details?: {}; amount?: number; fee_type?: FEE_TYPE } = {}
): Generator<TransactionDomainModel> {
  const start_timestamp = Date.now() - length * 1000

  const { provider_id, receipt_details = {}, amount = 100, fee_type = 'base_fee' } = options

  for (let i = 0; i < length; i++) {
    const timestamp = start_timestamp + i * 1000

    yield {
      transaction_id: uuid(),
      provider_id: provider_id ?? uuid(),
      device_id: uuid(),
      timestamp,
      amount, // "I'd buy THAT for a dollar!"
      fee_type,
      receipt: { ...receipt, receipt_details }
    }
  }
}

export function* transactionStatusesGenerator(
  length = 20,
  transaction_id = uuid()
): Generator<TransactionStatusDomainModel> {
  const start_timestamp = Date.now() - length * 1000

  for (let i = 0; i < length; i++) {
    const timestamp = start_timestamp + i * 1000

    yield {
      transaction_id,
      status_id: uuid(),
      timestamp,
      status_type: 'order_submitted',
      author: 'no one'
    }
  }
}

export function* transactionOperationsGenerator(
  length = 20,
  transaction_id = uuid()
): Generator<TransactionOperationDomainCreateModel> {
  const start_timestamp = Date.now() - length * 1000

  for (let i = 0; i < length; i++) {
    const timestamp = start_timestamp + i * 1000

    yield {
      transaction_id,
      operation_id: uuid(),
      timestamp,
      operation_type: 'invoice_generated',
      author: 'no one'
    }
  }
}
