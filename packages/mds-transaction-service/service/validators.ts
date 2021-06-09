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

import { SchemaObject, SchemaValidator } from '@mds-core/mds-schema-validators'
import {
  FEE_TYPE,
  ReceiptDomainModel,
  TransactionDomainModel,
  TransactionOperationDomainModel,
  TransactionStatusDomainModel,
  TRANSACTION_OPERATION_TYPE,
  TRANSACTION_STATUS_TYPE
} from '../@types'
import { UUID } from '@mds-core/mds-types'

const uuidSchema = { type: 'string', format: 'uuid' }

const timestampSchema = { type: 'integer', minimum: 100_000_000_000, maximum: 99_999_999_999_999 }

/**
 * Currently unused, but could be!
 */
// const { $schema: tripReceiptSchema } = SchemaValidator<TripReceiptDetailsDomainModel>({
//   type: 'object',
//   properties: {
//     trip_id: uuidSchema,
//     start_timestamp: timestampSchema,
//     end_timestamp: timestampSchema,
//     vehicle_type: { type: 'string', enum: [...VEHICLE_TYPES] },
//     start_geography_id: uuidSchema,
//     end_geography_id: { ...uuidSchema, nullable: true },
//     duration: { type: 'integer' }, // duration of the trip in seconds
//     distance: { type: 'integer' } // distance traveled in trip, in meters
//   },
//   required: [
//     'distance',
//     'duration',
//     'end_geography_id',
//     'end_timestamp',
//     'start_geography_id',
//     'start_timestamp',
//     'trip_events',
//     'trip_id',
//     'vehicle_type'
//   ]
// })

/**
 * Currently unused, but could be!
 */
// const { $schema: curbUseSchema } = SchemaValidator<CurbUseDetailsDomainModel>({
//   type: 'object',
//   properties: {
//     trip_id: uuidSchema,
//     start_timestamp: timestampSchema,
//     end_timestamp: timestampSchema,
//     vehicle_type: { type: 'string', enum: [...VEHICLE_TYPES] },
//     geography_id: { ...uuidSchema, nullable: true },
//     duration: { type: 'integer' }, // duration of the trip in seconds
//     trip_events: { type: 'array' } // Events which occurred in the trip, FIXME: add VehicleEvent schema
//   },
//   required: ['duration', 'end_timestamp', 'geography_id', 'start_timestamp', 'trip_events', 'trip_id', 'vehicle_type']
// })

const {
  $schema: { $schema, ...receiptSchema }
} = SchemaValidator<ReceiptDomainModel>(
  {
    type: 'object',
    properties: {
      receipt_id: uuidSchema,
      timestamp: timestampSchema,
      origin_url: {
        description: 'Where did this transaction originate?',
        type: 'string',
        format: 'uri',
        example: 'https://mds.coruscant.com/compliance/snapshot/c78280ff-4e58-4e30-afa9-d72673037799'
      },
      receipt_details: {
        description: 'Free-form object which describes the details of this transaction. Highly use-case dependent.',
        type: 'object'
      }
    },
    required: ['origin_url', 'receipt_details', 'receipt_id', 'timestamp']
  },
  { keywords: ['example'] }
)

export const { validate: validateTransactionDomainModel, $schema: TransactionSchema } =
  SchemaValidator<TransactionDomainModel>(
    {
      $id: 'Transaction',
      type: 'object',
      properties: {
        transaction_id: uuidSchema,
        provider_id: { ...uuidSchema, description: 'What Provider is being charged for this transaction?' },
        device_id: { ...uuidSchema, nullable: true },
        timestamp: timestampSchema,
        fee_type: { type: 'string', enum: [...FEE_TYPE] },
        amount: { type: 'integer' },
        receipt: receiptSchema
      },
      required: ['amount', 'device_id', 'fee_type', 'provider_id', 'receipt', 'timestamp', 'transaction_id']
    },
    { keywords: ['example'] }
  )

export const { validate: validateTransactionOperationDomainModel, $schema: TransactionOperationSchema } =
  SchemaValidator<TransactionOperationDomainModel>({
    $id: 'TransactionOperation',
    type: 'object',
    properties: {
      transaction_id: uuidSchema,
      operation_id: uuidSchema,
      timestamp: timestampSchema,
      operation_type: { type: 'string', enum: [...TRANSACTION_OPERATION_TYPE] },
      author: { description: 'Who/what executed this operation?', type: 'string' }
    },
    required: ['author', 'operation_id', 'operation_type', 'timestamp', 'transaction_id']
  })

export const { validate: validateTransactionStatusDomainModel, $schema: TransactionStatusSchema } =
  SchemaValidator<TransactionStatusDomainModel>({
    $id: 'TransactionStatus',
    type: 'object',
    properties: {
      transaction_id: uuidSchema,
      status_id: uuidSchema,
      timestamp: timestampSchema,
      status_type: { type: 'string', enum: [...TRANSACTION_STATUS_TYPE] },
      author: { description: 'Who/what updated the status of the transaction?', type: 'string' }
    },
    required: ['author', 'status_id', 'status_type', 'timestamp', 'transaction_id']
  })

export const { validate: validateTransactionId } = SchemaValidator<UUID>(uuidSchema)

export const { validate: validateTransactionIds } = SchemaValidator<UUID[]>({
  type: 'array',
  maxItems: 100,
  items: uuidSchema
})

export const schemas: SchemaObject[] = [TransactionSchema, TransactionOperationSchema, TransactionStatusSchema]
