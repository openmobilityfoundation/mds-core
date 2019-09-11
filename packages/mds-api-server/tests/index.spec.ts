/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable promise/prefer-await-to-callbacks */
/*
    Copyright 2019 City of Los Angeles.

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

import supertest from 'supertest'
import test from 'unit.js'
import { ApiServer, verifyAccessTokenScopeClaim } from '@mds-core/mds-api-server'
import { ApiAuthorizerClaims } from '@mds-core/mds-api-authorizer'

const request = supertest(ApiServer(app => app))

const APP_JSON = 'application/json; charset=utf-8'

describe('Testing API Server', () => {
  afterEach(done => {
    delete process.env.MAINTENANCE
    done()
  })

  it('verifies get root', done => {
    request
      .get('/')
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('name')
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('node')
        test.object(result.body).hasProperty('build')
        test.object(result.body).hasProperty('status', 'Running')
        done(err)
      })
  })

  it('verifies get root (MAINTENANCE)', done => {
    process.env.MAINTENANCE = 'Testing'
    request
      .get('/')
      .expect(503)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('name')
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('node')
        test.object(result.body).hasProperty('build')
        test.object(result.body).hasProperty('status', 'Testing (MAINTENANCE)')
        done(err)
      })
  })

  it('verifies health', done => {
    request
      .get('/health')
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('name')
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('node')
        test.object(result.body).hasProperty('build')
        test.object(result.body).hasProperty('process')
        test.object(result.body).hasProperty('memory')
        test.object(result.body).hasProperty('uptime')
        test.object(result.body).hasProperty('status', 'Running')
        done(err)
      })
  })

  it('verifies health (MAINTENANCE)', done => {
    process.env.MAINTENANCE = 'Testing'
    request
      .get('/health')
      .expect(503)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('name')
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('node')
        test.object(result.body).hasProperty('build')
        test.object(result.body).hasNotProperty('process')
        test.object(result.body).hasNotProperty('memory')
        test.object(result.body).hasNotProperty('uptime')
        test.object(result.body).hasProperty('status', 'Testing (MAINTENANCE)')
        done(err)
      })
  })

  it('verifies MAINTENANCE repsonse', done => {
    process.env.MAINTENANCE = 'Testing'
    request
      .get('/this-is-an-bad-route-but-it-should-return-503-in-maintenance-mode')
      .expect(503)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('status', 'Testing (MAINTENANCE)')
        done(err)
      })
  })

  it('verifies MAINTENANCE passthrough', done => {
    request
      .get('/this-is-an-bad-route-so-it-should-normally-return-404')
      .expect(404)
      .end(err => {
        done(err)
      })
  })

  type TestAccessScopes = 'scope:1' | 'scope:2' | 'scope:3' | 'scope:4'

  it('verifies access token scope enforcement', done => {
    // No claims / No scopes
    test.value(verifyAccessTokenScopeClaim<TestAccessScopes>(null)).is(true)

    test.value(verifyAccessTokenScopeClaim<TestAccessScopes>(null, [])).is(true)

    // No claims / Single scope
    test.value(verifyAccessTokenScopeClaim<TestAccessScopes>(null, ['scope:1'])).is(false)

    test.value(verifyAccessTokenScopeClaim<TestAccessScopes>(null, [], [], ['scope:1'])).is(false)

    // Single Required scope
    test
      .value(verifyAccessTokenScopeClaim<TestAccessScopes>({ scope: 'scope:1' } as ApiAuthorizerClaims, ['scope:1']))
      .is(true)

    test
      .value(verifyAccessTokenScopeClaim<TestAccessScopes>({ scope: 'scope:2' } as ApiAuthorizerClaims, ['scope:1']))
      .is(false)

    // Multiple Scopes OR
    test
      .value(
        verifyAccessTokenScopeClaim<TestAccessScopes>({ scope: 'scope:1' } as ApiAuthorizerClaims, [
          'scope:1',
          'scope:2'
        ])
      )
      .is(true)

    test
      .value(
        verifyAccessTokenScopeClaim<TestAccessScopes>({ scope: 'scope:3' } as ApiAuthorizerClaims, [
          'scope:1',
          'scope:2'
        ])
      )
      .is(false)

    // Multiple Scopes AND
    test
      .value(
        verifyAccessTokenScopeClaim<TestAccessScopes>(
          { scope: 'scope:1 scope:2' } as ApiAuthorizerClaims,
          ['scope:2'],
          ['scope:1']
        )
      )
      .is(true)

    test
      .value(
        verifyAccessTokenScopeClaim<TestAccessScopes>(
          { scope: 'scope:1' } as ApiAuthorizerClaims,
          ['scope:2'],
          ['scope:1']
        )
      )
      .is(false)

    // Multiple Scopes AND/OR
    test
      .value(
        verifyAccessTokenScopeClaim<TestAccessScopes>(
          { scope: 'scope:1 scope:2' } as ApiAuthorizerClaims,
          ['scope:1'],
          ['scope:2', 'scope:3']
        )
      )
      .is(true)

    test
      .value(
        verifyAccessTokenScopeClaim<TestAccessScopes>(
          { scope: 'scope:1 scope:4' } as ApiAuthorizerClaims,
          ['scope:1'],
          ['scope:2', 'scope:3']
        )
      )
      .is(false)

    done()
  })

  it('verifies access token scope bypass', done => {
    process.env.VERIFY_ACCESS_TOKEN_SCOPE = 'false'
    test.value(verifyAccessTokenScopeClaim<TestAccessScopes>(null, ['scope:1'])).is(true)
    done()
  })
})
