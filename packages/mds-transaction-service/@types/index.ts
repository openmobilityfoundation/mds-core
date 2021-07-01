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

import { DomainModelCreate } from '@mds-core/mds-repository'
import { RpcRoute, RpcServiceDefinition } from '@mds-core/mds-rpc-common'
import { Nullable, Timestamp, UUID, VehicleEvent, VEHICLE_TYPE } from '@mds-core/mds-types'
import { Cursor } from 'typeorm-cursor-pagination'

export interface PaginationLinks {
  prev: string | null
  next: string | null
}

// one example -- many others are possible
export interface TripReceiptDetailsDomainModel {
  trip_id: UUID
  start_timestamp: Timestamp
  end_timestamp: Timestamp
  vehicle_type: VEHICLE_TYPE
  start_geography_id: Nullable<UUID>
  end_geography_id: Nullable<UUID>
  duration: number // seconds
  distance: number // meters
  trip_events: VehicleEvent[]
}

export interface CurbUseDetailsDomainModel {
  trip_id: UUID
  start_timestamp: Timestamp
  end_timestamp: Timestamp
  vehicle_type: VEHICLE_TYPE
  geography_id: Nullable<UUID>
  duration: number // seconds
  trip_events: VehicleEvent[]
}

export const FEE_TYPE = <const>[
  'base_fee',
  'upgrade_fee',
  'congestion_fee',
  'trip_fee',
  'parking_fee',
  'reservation_fee',
  'distance_fee',
  'tolls_fee'
]

export type FEE_TYPE = typeof FEE_TYPE[number]

export interface ReceiptDomainModel {
  receipt_id: UUID
  timestamp: Timestamp // could be any time before the Transaction was created
  origin_url: string // where can I go to dig into the details of the receipt, given this receipt_id?
  receipt_details: TripReceiptDetailsDomainModel | CurbUseDetailsDomainModel | object // JSON blob with free-form supporting evidence, DO NOT INCLUDE PII
}

export interface TransactionDomainModel {
  transaction_id: UUID
  provider_id: UUID
  device_id: Nullable<UUID> // optional
  timestamp: Timestamp
  fee_type: FEE_TYPE
  amount: number // pennies
  receipt: ReceiptDomainModel // JSON blob
}
export type TransactionDomainCreateModel = DomainModelCreate<TransactionDomainModel>

export const TRANSACTION_OPERATION_TYPE = <const>[
  'transaction_posted',
  'invoice_generated',
  'dispute_requested',
  'dispute_approved',
  'dispute_declined',
  'dispute_canceled'
]

export type TRANSACTION_OPERATION_TYPE = typeof TRANSACTION_OPERATION_TYPE[number]

export interface TransactionOperationDomainModel {
  operation_id: UUID
  transaction_id: UUID
  // when was this change made
  timestamp: Timestamp
  operation_type: TRANSACTION_OPERATION_TYPE
  // who made this change (TODO work out authorship representation; could be human, could be api, etc.)
  author: string
}
export type TransactionOperationDomainCreateModel = DomainModelCreate<TransactionOperationDomainModel>

export const TRANSACTION_STATUS_TYPE = <const>[
  'order_submitted',
  'order_canceled',
  'order_complete',
  'order_incomplete'
]
export type TRANSACTION_STATUS_TYPE = typeof TRANSACTION_STATUS_TYPE[number]

export const SORTABLE_COLUMN = <const>['timestamp']
export type SORTABLE_COLUMN = typeof SORTABLE_COLUMN[number]

export const SORT_DIRECTION = <const>['ASC', 'DESC']
export type SORT_DIRECTION = typeof SORT_DIRECTION[number]

export interface TransactionSearchParams {
  provider_id?: UUID
  start_timestamp?: Timestamp
  end_timestamp?: Timestamp
  search_text?: string
  start_amount?: number
  end_amount?: number
  fee_type?: FEE_TYPE
  before?: string
  after?: string
  limit?: number
  order?: {
    column: SORTABLE_COLUMN
    direction: SORT_DIRECTION
  }
}

export interface TransactionStatusDomainModel {
  status_id: UUID
  transaction_id: UUID
  // when was this change made
  timestamp: Timestamp
  status_type: TRANSACTION_STATUS_TYPE
  // who made this change (TODO work out authorship representation; could be human, could be api, etc.)
  author: string
}
export type TransactionStatusDomainCreateModel = DomainModelCreate<TransactionStatusDomainModel>

export interface TransactionService {
  /**  TODO if auth token has a provider_id, it must match */
  createTransaction: (transaction: TransactionDomainCreateModel) => TransactionDomainModel
  /**  TODO if auth token has a provider_id, it must match */
  createTransactions: (transactions: TransactionDomainCreateModel[]) => TransactionDomainModel[]

  /**  if auth token has a provider_id, it must match */
  /**  read-back bulk TODO search criteria */
  getTransactions: (params: TransactionSearchParams) => { transactions: TransactionDomainModel[]; cursor: Cursor }
  /** TODO if auth token has a provider_id, it must match */
  /**  read back single */
  getTransaction: (transaction_id: TransactionDomainModel['transaction_id']) => TransactionDomainModel

  /** create an 'operation', e.g. for dispute-handling, etc. */
  /**  TODO if auth token has a provider_id, it must match */
  addTransactionOperation: (operation: TransactionOperationDomainCreateModel) => TransactionOperationDomainModel
  /** read back operations for a transaction */
  /**  TODO if auth token has a provider_id, it must match */
  getTransactionOperations: (
    transaction_id: TransactionDomainModel['transaction_id']
  ) => TransactionOperationDomainModel[]

  /** get all the status changes for this transaction (typically we won't have a ton I expect) */
  /**  TODO if auth token has a provider_id, it must match */
  getTransactionStatuses: (transaction_id: TransactionDomainModel['transaction_id']) => TransactionStatusDomainModel[]

  /**  TODO if auth token has a provider_id, it must match */
  getTransactionsStatuses: (
    tranaction_ids: TransactionDomainModel['transaction_id'][]
  ) => Record<TransactionDomainModel['transaction_id'], TransactionStatusDomainModel[]>

  /** add a new status change */
  /**  TODO if auth token has a provider_id, it must match */
  setTransactionStatus: (status: TransactionStatusDomainCreateModel) => TransactionStatusDomainModel
}

export const TransactionServiceDefinition: RpcServiceDefinition<TransactionService> = {
  createTransaction: RpcRoute<TransactionService['createTransaction']>(),
  createTransactions: RpcRoute<TransactionService['createTransactions']>(),

  getTransactions: RpcRoute<TransactionService['getTransactions']>(),
  getTransaction: RpcRoute<TransactionService['getTransaction']>(),

  addTransactionOperation: RpcRoute<TransactionService['addTransactionOperation']>(),
  getTransactionOperations: RpcRoute<TransactionService['getTransactionOperations']>(),

  getTransactionStatuses: RpcRoute<TransactionService['getTransactionStatuses']>(),
  getTransactionsStatuses: RpcRoute<TransactionService['getTransactionsStatuses']>(),
  setTransactionStatus: RpcRoute<TransactionService['setTransactionStatus']>()
}
