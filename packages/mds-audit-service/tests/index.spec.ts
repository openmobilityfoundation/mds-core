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

import { AuditServiceClient } from '../client'
import { AuditRepository } from '../repository'
import { AuditServiceManager } from '../service/manager'

describe('Audit Repository Tests', () => {
  beforeAll(async () => {
    await AuditRepository.initialize()
  })

  it('Run Migrations', async () => {
    await AuditRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await AuditRepository.revertAllMigrations()
  })

  afterAll(async () => {
    await AuditRepository.shutdown()
  })
})

const AuditServer = AuditServiceManager.controller()

describe('Audit Service Tests', () => {
  beforeAll(async () => {
    await AuditServer.start()
  })

  it('Test Name Method', async () => {
    const name = await AuditServiceClient.name()
    expect(name).toEqual('mds-audit-service')
  })

  afterAll(async () => {
    await AuditServer.stop()
  })
})
