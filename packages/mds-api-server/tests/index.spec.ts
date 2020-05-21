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
import { ApiServer, HttpServer, ApiVersionMiddleware, ApiVersionedResponse } from '../index'

const TEST_API_MIME_TYPE = 'application/vnd.mds.test+json'
const TEST_API_VERSIONS = ['0.1.0', '0.2.0'] as const
type TEST_API_VERSION = typeof TEST_API_VERSIONS[number]
const [DEFAULT_TEST_API_VERSION, ALTERNATE_TEST_API_VERSION] = TEST_API_VERSIONS

const api = ApiServer(app => {
  app.use(ApiVersionMiddleware(TEST_API_MIME_TYPE, TEST_API_VERSIONS).withDefaultVersion(DEFAULT_TEST_API_VERSION))
  app.get('/api-version-middleware-test', (req, res: ApiVersionedResponse<TEST_API_VERSION>) =>
    res.status(200).send({ version: res.locals.version })
  )
  return app
})

const request = supertest(api)

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

  it('verifies keepAliveTimeout setting', done => {
    let error
    process.env.HTTP_KEEP_ALIVE_TIMEOUT = '3000'
    const server = HttpServer(api)
    try {
      test.value(server.keepAliveTimeout).is(Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT))
    } catch (err) {
      error = err
    }
    server.close()
    done(error)
  })

  it('verifies version middleware OPTIONS request (version not acceptable)', done => {
    request
      .options('/api-version-middleware-test')
      .set('accept', `${TEST_API_MIME_TYPE};version=0.4;q=.9,${TEST_API_MIME_TYPE};version=0.5;`)
      .expect(406)
      .end((err, result) => {
        test.value(result.text).is('Not Acceptable')
        done(err)
      })
  })

  it('verifies version middleware OPTIONS request (with versions)', done => {
    request
      .options('/api-version-middleware-test')
      .set('accept', `${TEST_API_MIME_TYPE};version=0.2`)
      .expect(200)
      .end((err, result) => {
        test.value(result.header['content-type']).is(`${TEST_API_MIME_TYPE};version=0.2`)
        done(err)
      })
  })

  it('verifies version middleware (default version)', done => {
    request
      .get('/api-version-middleware-test')
      .expect(200)
      .end((err, result) => {
        test.value(result.header['content-type']).is(`${TEST_API_MIME_TYPE}; charset=utf-8; version=0.1`)
        test.value(result.body.version).is(DEFAULT_TEST_API_VERSION)
        done(err)
      })
  })

  it('verifies version middleware (with versions)', done => {
    request
      .get('/api-version-middleware-test')
      .set('accept', `${TEST_API_MIME_TYPE};version=0.2`)
      .expect(200)
      .end((err, result) => {
        test.value(result.header['content-type']).is(`${TEST_API_MIME_TYPE}; charset=utf-8; version=0.2`)
        test.value(result.body.version).is(ALTERNATE_TEST_API_VERSION)
        done(err)
      })
  })

  it('verifies version middleware (versions with q)', done => {
    request
      .get('/api-version-middleware-test')
      .set('accept', `${TEST_API_MIME_TYPE};version=0.2;q=.9,${TEST_API_MIME_TYPE};version=0.1;`)
      .expect(200)
      .end((err, result) => {
        test.value(result.header['content-type']).is(`${TEST_API_MIME_TYPE}; charset=utf-8; version=0.1`)
        test.value(result.body.version).is(DEFAULT_TEST_API_VERSION)
        done(err)
      })
  })

  it('verifies version middleware (version not acceptable)', done => {
    request
      .get('/api-version-middleware-test')
      .set('accept', `${TEST_API_MIME_TYPE};version=0.4;q=.9,${TEST_API_MIME_TYPE};version=0.5;`)
      .expect(406)
      .end((err, result) => {
        test.value(result.text).is('Not Acceptable')
        done(err)
      })
  })
})
