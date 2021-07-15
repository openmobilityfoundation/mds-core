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

import { ApiServer } from '@mds-core/mds-api-server'
import {
  TransactionDomainModel,
  TransactionServiceClient,
  transactionsGenerator
} from '@mds-core/mds-transaction-service'
// import { SCOPED_AUTH } from '@mds-core/mds-test-data'
import { NotFoundError, pathPrefix, uuid } from '@mds-core/mds-utils'
import supertest from 'supertest'
import { api } from '../api'
// FIXME: Should be importing from @mds-core/mds-test-data, but that's resulting an OOM crash...
const SCOPED_AUTH = (scopes: string[], principalId = '5f7114d1-4091-46ee-b492-e55875f7de00') =>
  `basic ${Buffer.from(`${principalId}|${scopes.join(' ')}`).toString('base64')}`

const request = supertest(ApiServer(api))

const basicOptionsUrls = (basicOptions: object) =>
  Object.entries(basicOptions).reduce((urlParams, [key, val]) => {
    if (val) {
      if (urlParams === '?') return `${urlParams}${key}=${val}`
      return `${urlParams}&${key}=${val}`
    }

    return urlParams
  }, '?')

expect.extend({
  toBeUrl(received) {
    const pass = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/.test(received)
    return {
      message: () => `expected ${received} to be a URL`,
      pass
    }
  }
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeUrl(): R
    }
  }
}

describe('Test Transactions API: Transactions', () => {
  beforeAll(async () => {
    jest.clearAllMocks()
  })

  describe('Success', () => {
    it('Can POST a transaction', async () => {
      const [transaction] = transactionsGenerator()

      jest
        .spyOn(TransactionServiceClient, 'createTransaction')
        .mockImplementationOnce(async t => t as TransactionDomainModel)

      const result = await request
        .post(pathPrefix('/transaction'))
        .set('Authorization', SCOPED_AUTH(['transactions:write']))
        .send(transaction)

      expect(result.status).toStrictEqual(201)
    })

    it('Can bulk POST transactions', async () => {
      const transactions = transactionsGenerator(15)

      jest
        .spyOn(TransactionServiceClient, 'createTransactions')
        .mockImplementationOnce(async t => t as TransactionDomainModel[])

      const result = await request
        .post(pathPrefix('/transactions'))
        .set('Authorization', SCOPED_AUTH(['transactions:write']))
        .send(transactions)

      expect(result.status).toStrictEqual(201)
    })

    it('Can GET one transaction', async () => {
      const [mockTransaction] = transactionsGenerator()
      const { transaction_id } = mockTransaction

      jest.spyOn(TransactionServiceClient, 'getTransaction').mockImplementationOnce(async _ => mockTransaction)

      const result = await request
        .get(pathPrefix(`/transactions/${transaction_id}`))
        .set('Authorization', SCOPED_AUTH(['transactions:read']))

      expect(result.body.transaction).toStrictEqual(mockTransaction)
      expect(result.status).toStrictEqual(200)
    })

    it('Can GET bulk transactions with no options', async () => {
      const mockTransactions = [...transactionsGenerator(15)]

      jest.spyOn(TransactionServiceClient, 'getTransactions').mockImplementationOnce(async _ => ({
        transactions: mockTransactions,
        cursor: { beforeCursor: null, afterCursor: null }
      }))

      const result = await request
        .get(pathPrefix(`/transactions`))
        .set('Authorization', SCOPED_AUTH(['transactions:read']))

      expect(result.body.transactions).toStrictEqual(mockTransactions)
      expect(result.status).toStrictEqual(200)
    })

    it('Can GET bulk transactions with all basic options', async () => {
      const mockTransactions = [...transactionsGenerator(15)]

      const basicOptions = {
        provider_id: uuid(),
        start_timestamp: Date.now(),
        end_timestamp: Date.now(),
        before: 'arbitraryBeforeCursor',
        after: 'arbitraryAfterCursor',
        limit: 10
      }

      const getTransactionsMock = jest
        .spyOn(TransactionServiceClient, 'getTransactions')
        .mockImplementationOnce(async _ => ({
          transactions: mockTransactions,
          cursor: { beforeCursor: 'arbitraryBeforeCursor', afterCursor: 'arbitraryAfterCursor' }
        }))

      const result = await request
        .get(pathPrefix(`/transactions${basicOptionsUrls(basicOptions)}`))
        .set('Authorization', SCOPED_AUTH(['transactions:read']))

      expect(getTransactionsMock).toBeCalledWith({
        ...basicOptions,
        order: undefined
      })

      expect(result.status).toStrictEqual(200)
      expect(result.body.transactions).toStrictEqual(mockTransactions)
    })

    it('Can GET bulk transactions with partial basic options', async () => {
      const mockTransactions = [...transactionsGenerator(15)]

      const basicOptions = {
        provider_id: uuid(),
        start_timestamp: Date.now(),
        end_timestamp: undefined,
        before: undefined,
        after: undefined,
        limit: 10
      }

      const getTransactionsMock = jest
        .spyOn(TransactionServiceClient, 'getTransactions')
        .mockImplementationOnce(async _ => ({
          transactions: mockTransactions,
          cursor: { beforeCursor: 'arbitraryBeforeCursor', afterCursor: 'arbitraryAfterCursor' }
        }))

      const result = await request
        .get(pathPrefix(`/transactions${basicOptionsUrls(basicOptions)}`))
        .set('Authorization', SCOPED_AUTH(['transactions:read']))

      expect(getTransactionsMock).toBeCalledWith({
        ...basicOptions,
        order: undefined
      })

      expect(result.status).toStrictEqual(200)
      expect(result.body.transactions).toStrictEqual(mockTransactions)
    })

    it('Can GET bulk transactions with order options', async () => {
      const mockTransactions = [...transactionsGenerator(15)]

      const getTransactionsMock = jest
        .spyOn(TransactionServiceClient, 'getTransactions')
        .mockImplementationOnce(async _ => ({
          transactions: mockTransactions,
          cursor: { beforeCursor: null, afterCursor: null }
        }))

      const result = await request
        .get(pathPrefix(`/transactions?order_column=timestamp&order_direction=DESC`))
        .set('Authorization', SCOPED_AUTH(['transactions:read']))

      expect(getTransactionsMock).toBeCalledWith({
        provider_id: undefined,
        start_timestamp: undefined,
        end_timestamp: undefined,
        before: undefined,
        after: undefined,
        limit: 10,
        order: {
          column: 'timestamp',
          direction: 'DESC'
        }
      })

      expect(result.status).toStrictEqual(200)
      expect(result.body.transactions).toStrictEqual(mockTransactions)
    })

    it('Can GET bulk transactions with all the options at once', async () => {
      const mockTransactions = [...transactionsGenerator(15)]

      const basicOptions = {
        provider_id: uuid(),
        start_timestamp: Date.now(),
        end_timestamp: Date.now(),
        before: 'arbitraryBeforeCursor',
        after: 'arbitraryAfterCursor',
        limit: 10
      }

      const getTransactionsMock = jest
        .spyOn(TransactionServiceClient, 'getTransactions')
        .mockImplementationOnce(async _ => ({
          transactions: mockTransactions,
          cursor: { beforeCursor: 'arbitraryBeforeCursor', afterCursor: 'arbitraryAfterCursor' }
        }))

      const result = await request
        .get(pathPrefix(`/transactions${basicOptionsUrls(basicOptions)}&order_column=timestamp&order_direction=DESC`))
        .set('Authorization', SCOPED_AUTH(['transactions:read']))

      expect(getTransactionsMock).toBeCalledWith({
        ...basicOptions,
        order: {
          column: 'timestamp',
          direction: 'DESC'
        }
      })

      const {
        transactions,
        links: { prev, next }
      } = result.body

      expect(result.status).toStrictEqual(200)
      expect(transactions).toStrictEqual(mockTransactions)
      expect(prev).toBeUrl()
      expect(next).toBeUrl()
    })

    it('Will override provider_id if not included when client has transactions:read:provider scope', async () => {
      const mockTransactions: TransactionDomainModel[] = []
      const provider_id_scoped = uuid() // only provider_id allowed for client
      const basicOptions = {
        start_timestamp: Date.now(),
        end_timestamp: undefined,
        before: undefined,
        after: undefined,
        limit: 10
      }

      const getTransactionsMock = jest
        .spyOn(TransactionServiceClient, 'getTransactions')
        .mockImplementationOnce(async _ => ({
          transactions: mockTransactions,
          cursor: { beforeCursor: 'arbitraryBeforeCursor', afterCursor: 'arbitraryAfterCursor' }
        }))

      const result = await request
        .get(pathPrefix(`/transactions${basicOptionsUrls(basicOptions)}`))
        .set('Authorization', SCOPED_AUTH(['transactions:read:provider'], provider_id_scoped))

      expect(getTransactionsMock).toBeCalledWith({
        ...basicOptions,
        provider_id: provider_id_scoped, // ensure provider query param is overridden when passed to service
        order: undefined
      })
      expect(result.status).toBe(200)
    })

    it('Will override provider_id query param when client has transactions:read:provider scope', async () => {
      const mockTransactions: TransactionDomainModel[] = []
      const provider_id = uuid() // desired provider_id
      const provider_id_scoped = uuid() // only provider_id allowed for client
      const basicOptions = {
        provider_id,
        start_timestamp: Date.now(),
        end_timestamp: undefined,
        before: undefined,
        after: undefined,
        limit: 10
      }

      const getTransactionsMock = jest
        .spyOn(TransactionServiceClient, 'getTransactions')
        .mockImplementationOnce(async _ => ({
          transactions: mockTransactions,
          cursor: { beforeCursor: 'arbitraryBeforeCursor', afterCursor: 'arbitraryAfterCursor' }
        }))

      const result = await request
        .get(pathPrefix(`/transactions${basicOptionsUrls(basicOptions)}`))
        .set('Authorization', SCOPED_AUTH(['transactions:read:provider'], provider_id_scoped))

      expect(getTransactionsMock).toBeCalledWith({
        ...basicOptions,
        provider_id: provider_id_scoped, // ensure provider query param is overridden when passed to service
        order: undefined
      })
      expect(result.status).toBe(200)
    })
  })

  describe('Failure', () => {
    it('Invalid order options are rejected by the API', async () => {
      const [order_column, order_direction] = ['something_incredibly_disorderly', 'high_heaven']
      const result = await request
        .get(pathPrefix(`/transactions?order_column=${order_column}&order_direction=${order_direction}`))
        .set('Authorization', SCOPED_AUTH(['transactions:read']))

      expect(result.status).toStrictEqual(400)
    })

    it('GETting a non-existent transaction fails', async () => {
      jest.spyOn(TransactionServiceClient, 'getTransaction').mockImplementationOnce(async _ => {
        throw new NotFoundError()
      })

      const result = await request
        .get(pathPrefix(`/transactions/${uuid()}`))
        .set('Authorization', SCOPED_AUTH(['transactions:read']))

      expect(result.status).toStrictEqual(404)
    })
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
