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
import { transactionStatusesGenerator, TransactionServiceClient } from '@mds-core/mds-transaction-service'
// import { SCOPED_AUTH } from '@mds-core/mds-test-data'
import { pathPrefix } from '@mds-core/mds-utils'
import { api } from '../api'

const request = supertest(ApiServer(api))

// FIXME: Should be importing from @mds-core/mds-test-data, but that's resulting an OOM crash...
const SCOPED_AUTH = (scopes: string[], principalId = '5f7114d1-4091-46ee-b492-e55875f7de00') =>
  `basic ${Buffer.from(`${principalId}|${scopes.join(' ')}`).toString('base64')}`

describe('Test Transactions API: Transactions', () => {
  beforeAll(async () => {
    jest.clearAllMocks()
  })

  describe('Success', () => {
    it('Can POST a transaction status', async () => {
      const [status] = transactionStatusesGenerator()
      const { transaction_id } = status

      jest.spyOn(TransactionServiceClient, 'setTransactionStatus').mockImplementationOnce(async t => t as any)

      const result = await request
        .post(pathPrefix(`/transaction/${transaction_id}/statuses`))
        .set('Authorization', SCOPED_AUTH(['transactions:write']))
        .send(status)

      expect(result.status).toStrictEqual(201)
    })

    it('Can GET transaction statuses', async () => {
      const mockStatuses = [...transactionStatusesGenerator(5)]
      const [{ transaction_id }] = mockStatuses

      jest.spyOn(TransactionServiceClient, 'getTransactionStatuses').mockImplementationOnce(async _ => mockStatuses)

      const result = await request
        .get(pathPrefix(`/transactions/${transaction_id}/statuses`))
        .set('Authorization', SCOPED_AUTH(['transactions:write']))

      expect(result.status).toStrictEqual(200)
      expect(result.body.statuses).toStrictEqual(mockStatuses)
    })
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
