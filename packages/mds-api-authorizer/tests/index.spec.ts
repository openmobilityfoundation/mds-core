/**
 * Copyright 2019 City of Los Angeles
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

import test from 'unit.js'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import express from 'express'
import jwt from 'jsonwebtoken'
import { uuid } from '@mds-core/mds-utils'
import { AuthorizationHeaderApiAuthorizer, WebSocketAuthorizer, CustomClaim } from '../index'

const PROVIDER_SCOPES = 'admin:all'
const PROVIDER_SUBJECT = uuid()
const PROVIDER_EMAIL = 'user@test.ai'

const { env } = process

const Basic = () => `Basic ${Buffer.from(`${MOCHA_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`

const Bearer = () =>
  `Bearer ${jwt.sign(
    {
      sub: PROVIDER_SUBJECT,
      [CustomClaim('user_email')]: PROVIDER_EMAIL,
      [CustomClaim('provider_id')]: MOCHA_PROVIDER_ID,
      scope: PROVIDER_SCOPES
    },
    'secret'
  )}`

describe('Test API Authorizer', () => {
  before(() => {
    process.env = { TOKEN_CUSTOM_CLAIM_NAMESPACE: 'https://test.ai/' }
  })

  describe('Authorizaton Header Authorizer', () => {
    it('No Authorizaton', async () => {
      test.value(AuthorizationHeaderApiAuthorizer({} as express.Request)).is(null)
    })

    it('Invalid Authorizaton Scheme', async () => {
      test
        .value(
          AuthorizationHeaderApiAuthorizer({
            headers: { authorization: 'invalid' }
          } as express.Request)
        )
        .is(null)
    })

    it('Basic Authorizaton', async () => {
      test
        .object(
          AuthorizationHeaderApiAuthorizer({
            headers: { authorization: Basic() }
          } as express.Request)
        )
        .hasProperty('principalId', MOCHA_PROVIDER_ID)
        .hasProperty('provider_id', MOCHA_PROVIDER_ID)
        .hasProperty('scope', PROVIDER_SCOPES)
    })

    it('Bearer Authorizaton', async () => {
      test
        .object(
          AuthorizationHeaderApiAuthorizer({
            headers: { authorization: Bearer() }
          } as express.Request)
        )
        .hasProperty('principalId', PROVIDER_SUBJECT)
        .hasProperty('provider_id', MOCHA_PROVIDER_ID)
        .hasProperty('user_email', PROVIDER_EMAIL)
        .hasProperty('scope', PROVIDER_SCOPES)
    })
  })

  describe('WebSocket Authorizer', () => {
    it('Basic Authorization', async () => {
      test
        .object(WebSocketAuthorizer(Basic()))
        .hasProperty('principalId', MOCHA_PROVIDER_ID)
        .hasProperty('provider_id', MOCHA_PROVIDER_ID)
        .hasProperty('scope', PROVIDER_SCOPES)
    })

    it('Bearer Authorization', async () => {
      test
        .object(WebSocketAuthorizer(Bearer()))
        .hasProperty('principalId', PROVIDER_SUBJECT)
        .hasProperty('provider_id', MOCHA_PROVIDER_ID)
        .hasProperty('user_email', PROVIDER_EMAIL)
        .hasProperty('scope', PROVIDER_SCOPES)
    })
  })

  after(() => {
    process.env = env
  })
})
