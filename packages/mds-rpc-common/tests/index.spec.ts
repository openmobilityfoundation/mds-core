/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import test from 'unit.js'
import { ServiceResult, ServiceError, ServiceClient } from '@mds-core/mds-service-helpers'
import { RpcServiceDefinition } from '../@types'
import { RpcRoute } from '../index'
import { RpcClient, RpcRequest } from '../client'
import { RpcServer } from '../server'

const TEST_WORD = 'mds-rpc-common'

interface TestService {
  length: (word?: string) => number
}

export const TestServiceRpcDefinition: RpcServiceDefinition<TestService> = {
  length: RpcRoute<TestService['length']>()
}

const TestServer = RpcServer(
  TestServiceRpcDefinition,
  {
    onStart: async () => undefined,
    onStop: async () => undefined
  },
  {
    length: async ([word]) =>
      word && word.length > 0 ? ServiceResult(word.length) : ServiceError({ type: 'NotFoundError', message: 'No Word' })
  }
).controller()

describe('Test RPC Client', () => {
  const TestClient: ServiceClient<TestService> = {
    length: word => RpcRequest(RpcClient(TestServiceRpcDefinition).length, [word])
  }

  it('Test Service Unavailable', async () => {
    try {
      await TestClient.length(TEST_WORD)
      test.value(true).is(false)
    } catch (error) {
      test.object(error).hasProperty('type', 'ServiceUnavailable')
    }
  })

  describe('Test Service Available', () => {
    before(async () => {
      await TestServer.start()
    })

    it('Test Service Result', async () => {
      try {
        const length = await TestClient.length(TEST_WORD)
        test.value(length).is(TEST_WORD.length)
      } catch (error) {
        test.value(true).is(false)
      }
    })

    it('Test Service Error', async () => {
      try {
        await TestClient.length()
        test.value(true).is(false)
      } catch (error) {
        test.object(error).hasProperty('type', 'NotFoundError')
      }
    })

    after(async () => {
      await TestServer.stop()
    })
  })
})
