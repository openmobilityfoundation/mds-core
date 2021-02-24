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

import supertest from 'supertest'
import { ApiServer } from '@mds-core/mds-api-server'
import { transactionOperationsGenerator, TransactionServiceClient } from '@mds-core/mds-transactions-service'
// import { SCOPED_AUTH } from '@mds-core/mds-test-data'
import { pathPrefix, uuid } from '@mds-core/mds-utils'
import { api } from '../api'

const request = supertest(ApiServer(api))

// FIXME: Should be importing from @mds-core/mds-test-data, but that's resulting an OOM crash...
const SCOPED_AUTH = (scopes: string[], principalId = '5f7114d1-4091-46ee-b492-e55875f7de00') =>
  `basic ${Buffer.from(`${principalId}|${scopes.join(' ')}`).toString('base64')}`

describe('Test Transactions API: Transaction Operations', () => {
  beforeAll(async () => {
    jest.clearAllMocks()
  })

  describe('Success', () => {
    it('Can POST a transaction operation', async () => {
      const [operation] = transactionOperationsGenerator()
      const { transaction_id } = operation

      jest.spyOn(TransactionServiceClient, 'addTransactionOperation').mockImplementationOnce(async o => o as any)

      const result = await request
        .post(pathPrefix(`/transactions/${transaction_id}/operations`))
        .set('Authorization', SCOPED_AUTH(['transactions:write']))
        .send(operation)

      expect(result.status).toEqual(201)
    })

    it('Can GET operations for a transaction', async () => {
      const transaction_id = uuid()
      const mockOperations = [...transactionOperationsGenerator(5, transaction_id)]
      jest
        .spyOn(TransactionServiceClient, 'getTransactionOperations')
        .mockImplementationOnce(async _ => mockOperations as any)

      const result = await request
        .get(pathPrefix(`/transactions/${transaction_id}/operations`))
        .set('Authorization', SCOPED_AUTH(['transactions:read']))

      expect(result.status).toEqual(200)
      expect(result.body.operations.length).toEqual(5)
      expect(result.body.operations).toStrictEqual(mockOperations)
    })
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
