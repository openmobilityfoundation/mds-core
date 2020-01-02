import test from 'unit.js'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import express from 'express'
import { AuthorizationHeaderApiAuthorizer, WebSocketAuthorizer } from '../index'

const PROVIDER_SCOPES = 'admin:all'
const ADMIN_AUTH = `basic ${Buffer.from(`${MOCHA_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`

describe('Test API Authorizer', () => {
  it('No Authorizaton', done => {
    const authorizer = AuthorizationHeaderApiAuthorizer({} as express.Request)
    test.value(authorizer).is(null)
    done()
  })

  it('Invalid Authorizaton Scheme', done => {
    const authorizer = AuthorizationHeaderApiAuthorizer({ headers: { authorization: 'invalid' } } as express.Request)
    test.value(authorizer).is(null)
    done()
  })

  it('Basic Authorizaton', done => {
    const apiAuthorizer = AuthorizationHeaderApiAuthorizer({
      headers: { authorization: ADMIN_AUTH }
    } as express.Request)
    test
      .object(apiAuthorizer)
      .hasProperty('principalId', MOCHA_PROVIDER_ID)
      .hasProperty('scope', PROVIDER_SCOPES)

    const webSocketAuthorizer = WebSocketAuthorizer(ADMIN_AUTH)
    test
      .object(webSocketAuthorizer)
      .hasProperty('principalId', MOCHA_PROVIDER_ID)
      .hasProperty('scope', PROVIDER_SCOPES)
    done()
  })

  it('Bearer Authorizaton', done => {
    const apiAuthorizer = AuthorizationHeaderApiAuthorizer({
      headers: { authorization: ADMIN_AUTH }
    } as express.Request)
    test
      .object(apiAuthorizer)
      .hasProperty('principalId', 'c8051767-4b14-4794-abc1-85aad48baff1')
      .hasProperty('scope', PROVIDER_SCOPES)

    const webSocketAuthorizer = WebSocketAuthorizer(ADMIN_AUTH)
    test
      .object(webSocketAuthorizer)
      .hasProperty('principalId', 'c8051767-4b14-4794-abc1-85aad48baff1')
      .hasProperty('scope', PROVIDER_SCOPES)
    done()
  })
})
