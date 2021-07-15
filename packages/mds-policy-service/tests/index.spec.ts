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

import { PolicyServiceClient } from '../client'
import { PolicyRepository } from '../repository'
import { PolicyServiceManager } from '../service/manager'

describe('Policy Repository Tests', () => {
  beforeAll(async () => {
    await PolicyRepository.initialize()
  })

  it('Run Migrations', async () => {
    await PolicyRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await PolicyRepository.revertAllMigrations()
  })

  afterAll(async () => {
    await PolicyRepository.shutdown()
  })
})

const PolicyServer = PolicyServiceManager.controller()

describe('Policy Service Tests', () => {
  beforeAll(async () => {
    await PolicyServer.start()
  })

  it('Test Name Method', async () => {
    const name = await PolicyServiceClient.name()
    expect(name).toEqual('mds-policy-service')
  })

  afterAll(async () => {
    await PolicyServer.stop()
  })
})
