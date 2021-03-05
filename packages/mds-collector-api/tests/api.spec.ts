/**
 * Copyright 2021 City of Los Angeles
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
import HttpStatus from 'http-status-codes'
import { CollectorServiceClient } from '@mds-core/mds-collector-backend'
import { CollectorBackendController } from '@mds-core/mds-collector-backend/service/backend'
import { ApiServer } from '@mds-core/mds-api-server'
import { pathPrefix, uuid } from '@mds-core/mds-utils'
import { UUID } from '@mds-core/mds-types'
import { CollectorApiAccessTokenScopes, COLLECTOR_API_DEFAULT_VERSION, COLLECTOR_API_MIME_TYPE } from '../@types'
import { api } from '../api'
import TestSchema from '@mds-core/mds-collector-backend/schemas/test.schema'

const CollectorBackend = CollectorBackendController()
const request = supertest(ApiServer(api))
const [major, minor] = COLLECTOR_API_DEFAULT_VERSION.split('.')
const CollectorApiContentType = `${COLLECTOR_API_MIME_TYPE}; charset=utf-8; version=${major}.${minor}`
const TEST_SCHEMA_ID = 'test'
const TEST_PROVIDER_ID = uuid()
const TEST_COLLECTOR_MESSAGES = [
  { id: uuid(), name: 'President', country: 'US', zip: '37188' },
  { id: uuid(), name: 'Prime Minister', country: 'CA', zip: 'K1M 1M4' }
]

const Get = (path: string, provider_id?: UUID, ...scopes: CollectorApiAccessTokenScopes[]) => {
  const url = pathPrefix(path)
  return {
    Responds: (code: number, response: Partial<{ body: {}; headers: {} }> = {}) =>
      it(`GET ${url} (${code} ${HttpStatus.getStatusText(code).toUpperCase()})`, async () => {
        expect(
          await request
            .get(url)
            .set(
              provider_id
                ? { Authorization: `basic ${Buffer.from(`${provider_id}|${scopes.join(' ')}`).toString('base64')}` }
                : {}
            )
            .expect(code)
        ).toMatchObject(response)
      })
  }
}

const Post = (path: string, body: {}, provider_id?: UUID, ...scopes: CollectorApiAccessTokenScopes[]) => {
  const url = pathPrefix(path)
  return {
    Responds: (code: number, response: Partial<{ body: {}; headers: {} }> = {}) =>
      it(`POST ${url} (${code} ${HttpStatus.getStatusText(code).toUpperCase()})`, async () => {
        expect(
          await request
            .post(url)
            .set(
              provider_id
                ? { Authorization: `basic ${Buffer.from(`${provider_id}|${scopes.join(' ')}`).toString('base64')}` }
                : {}
            )
            .send(body)
            .expect(code)
        ).toMatchObject(response)
      })
  }
}

describe('Collector API', () => {
  describe('Service Unavailable', () => {
    Get('/schema/test', TEST_PROVIDER_ID).Responds(HttpStatus.SERVICE_UNAVAILABLE, {
      headers: { 'content-type': CollectorApiContentType },
      body: { error: { isServiceError: true, type: 'ServiceUnavailable' } }
    })
  })

  describe('API Endpoints', () => {
    beforeAll(async () => {
      await CollectorBackend.start()
      await CollectorServiceClient.registerMessageSchema('test', TestSchema)
    })

    Get('/not-found').Responds(HttpStatus.NOT_FOUND)

    Get('/health').Responds(HttpStatus.OK, {
      body: { name: process.env.npm_package_name, version: process.env.npm_package_version, status: 'Running' }
    })

    Get('/schema/forbidden').Responds(HttpStatus.FORBIDDEN)

    Get('/schema/notfound', TEST_PROVIDER_ID).Responds(HttpStatus.NOT_FOUND, {
      headers: { 'content-type': CollectorApiContentType },
      body: { error: { isServiceError: true, type: 'NotFoundError' } }
    })

    Get('/schema/test', TEST_PROVIDER_ID).Responds(HttpStatus.OK, {
      headers: { 'content-type': CollectorApiContentType },
      body: { $schema: 'http://json-schema.org/draft-07/schema#' }
    })

    Post('/schema/forbidden', {}).Responds(HttpStatus.FORBIDDEN)

    Post('/schema/notfound', [{}], TEST_PROVIDER_ID).Responds(HttpStatus.NOT_FOUND, {
      headers: { 'content-type': CollectorApiContentType },
      body: { error: { isServiceError: true, type: 'NotFoundError' } }
    })

    Post('/schema/test', TEST_COLLECTOR_MESSAGES, TEST_PROVIDER_ID).Responds(HttpStatus.CREATED, {
      headers: { 'content-type': CollectorApiContentType },
      body: TEST_COLLECTOR_MESSAGES.map(message => ({
        schema_id: TEST_SCHEMA_ID,
        provider_id: TEST_PROVIDER_ID,
        message
      }))
    })

    Post('/schema/test', [{ ...TEST_COLLECTOR_MESSAGES[0], email: 'invalid' }], TEST_PROVIDER_ID).Responds(
      HttpStatus.BAD_REQUEST,
      {
        headers: { 'content-type': CollectorApiContentType },
        body: { error: { isServiceError: true, type: 'ValidationError' } }
      }
    )

    afterAll(async () => {
      await CollectorBackend.stop()
    })
  })
})
