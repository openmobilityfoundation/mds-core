import test from 'unit.js'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import express from 'express'
import jwt from 'jsonwebtoken'
import { uuid } from '@mds-core/mds-utils'
import { AuthorizationHeaderApiAuthorizer, WebSocketAuthorizer } from '../index'

const TOKEN_PROVIDER_ID_CLAIM = 'https://test.ai/provider_id'
const PROVIDER_SCOPES = 'admin:all'
const PROVIDER_SUBJECT = uuid()
const PROVIDER_EMAIL = 'user@test.ai'

const Basic = `Basic ${Buffer.from(`${MOCHA_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`

const Bearer = `Bearer ${jwt.sign(
  {
    sub: PROVIDER_SUBJECT,
    'https://ladot.io/user_email': PROVIDER_EMAIL,
    [TOKEN_PROVIDER_ID_CLAIM]: MOCHA_PROVIDER_ID,
    scope: PROVIDER_SCOPES
  },
  'secret'
)}`

let env: NodeJS.ProcessEnv

process.env.TOKEN_PROVIDER_ID_CLAIM = TOKEN_PROVIDER_ID_CLAIM

describe('Test API Authorizer', () => {
  before(() => {
    env = process.env
    process.env = { TOKEN_PROVIDER_ID_CLAIM }
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
            headers: { authorization: Basic }
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
            headers: { authorization: Bearer }
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
        .object(WebSocketAuthorizer(Basic))
        .hasProperty('principalId', MOCHA_PROVIDER_ID)
        .hasProperty('provider_id', MOCHA_PROVIDER_ID)
        .hasProperty('scope', PROVIDER_SCOPES)
    })

    it('Bearer Authorization', async () => {
      test
        .object(WebSocketAuthorizer(Bearer))
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
