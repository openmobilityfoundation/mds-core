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

import { IngestServiceManager } from '../service/manager'
import { IngestServiceClient } from '../client'
import { IngestRepository } from '../repository'

describe('Ingest Repository Tests', () => {
  beforeAll(async () => {
    await IngestRepository.initialize()
  })

  it('Run Migrations', async () => {
    await IngestRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await IngestRepository.revertAllMigrations()
  })

  afterAll(async () => {
    await IngestRepository.shutdown()
  })
})

const IngestServer = IngestServiceManager.controller()

describe('Ingest Service Tests', () => {
  beforeAll(async () => {
    await IngestServer.start()
  })

  it('Test Name Method', async () => {
    const name = await IngestServiceClient.name()
    expect(name).toEqual('mds-ingest-backend')
  })

  afterAll(async () => {
    await IngestServer.stop()
  })
})
