// Copyright 2021 City of Los Angeles
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { uuid } from '@mds-core/mds-utils'
import { TestSchema } from '@mds-core/mds-schema-validators'
import { CollectorServiceClient, CollectorServiceClientFactory } from '../client'
import { CollectorBackendController } from '../service/backend'
import { CollectorRepository } from '../repository'

const CollectorBackend = CollectorBackendController()
const TEST_SCHEMA_ID = 'test'
const TEST_COLLECTOR_MESSAGES: Array<TestSchema> = [
  { id: uuid(), name: 'President', country: 'US', zip: '37188' },
  { id: uuid(), name: 'Prime Minister', country: 'CA', zip: 'K1M 1M4' }
]

const TestSchemaCollectorClient = CollectorServiceClientFactory(TEST_SCHEMA_ID, TestSchema)

describe('Collector Service', () => {
  it('Service Unavailable', async () => {
    await expect(CollectorServiceClient.getMessageSchema(TEST_SCHEMA_ID)).rejects.toMatchObject({
      isServiceError: true,
      type: 'ServiceUnavailable'
    })
  })

  describe('Repository Migrations', () => {
    beforeAll(async () => {
      await CollectorRepository.initialize()
    })

    it('Run Migrations', async () => {
      await CollectorRepository.runAllMigrations()
    })

    it('Revert Migrations', async () => {
      await CollectorRepository.revertAllMigrations()
    })

    afterAll(async () => {
      await CollectorRepository.shutdown()
    })
  })

  describe('Service Methods', () => {
    beforeAll(async () => {
      await CollectorBackend.start()
    })

    it('Register Schema (OK)', async () => {
      await expect(TestSchemaCollectorClient.registerMessageSchema()).resolves.toEqual(true)
    })

    it('Register Schema (Error)', async () => {
      await expect(
        CollectorServiceClient.registerMessageSchema(TEST_SCHEMA_ID, { type: 'invalid' })
      ).rejects.toMatchObject({ isServiceError: true, type: 'ServiceException' })
    })

    it('Get Schema (OK)', async () => {
      const schema = await TestSchemaCollectorClient.getMessageSchema()
      expect(schema).toMatchObject({ $schema: 'http://json-schema.org/draft-07/schema#', ...TestSchema })
    })

    it('Get Schema (Error)', async () => {
      await expect(CollectorServiceClient.getMessageSchema('notfound')).rejects.toMatchObject({
        isServiceError: true,
        type: 'NotFoundError'
      })
    })

    it('Write Schema Messages (OK)', async () => {
      const provider_id = uuid()
      const written = await TestSchemaCollectorClient.writeSchemaMessages(provider_id, TEST_COLLECTOR_MESSAGES)
      expect(written).toMatchObject(
        TEST_COLLECTOR_MESSAGES.map(message => ({ schema_id: TEST_SCHEMA_ID, provider_id, message }))
      )
    })

    it('Write Schema Messages (Error)', async () => {
      const [message] = TEST_COLLECTOR_MESSAGES
      await expect(
        TestSchemaCollectorClient.writeSchemaMessages(uuid(), [{ ...message, email: 'invalid' }])
      ).rejects.toMatchObject({
        isServiceError: true,
        type: 'ValidationError'
      })
    })

    afterAll(async () => {
      await CollectorBackend.stop()
    })
  })
})
