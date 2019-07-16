import supertest from 'supertest'
import test from 'unit.js'
import { server } from 'mds-api-server'
import { PROVIDER_UUID } from 'mds-test-data'
import { api } from '../api'

process.env.PATH_PREFIX = '/native'
const PROVIDER_SCOPES = 'admin:all test:all'
const ADMIN_AUTH = `basic ${Buffer.from(`${PROVIDER_UUID}|${PROVIDER_SCOPES}`).toString('base64')}`
const NO_PROVIDER_ID = `basic ${Buffer.from(`|${PROVIDER_SCOPES}`).toString('base64')}`
const APP_JSON = 'application/json; charset=utf-8'

const request = supertest(server(api))

before('Initializing Database', done => {
  request
    .get('/native/test/initialize')
    .set('Authorization', ADMIN_AUTH)
    .expect(200)
    .end((err, result) => {
      test.value(result).hasHeader('content-type', APP_JSON)
      done(err)
    })
})

describe('Verify API', () => {
  it('Get events (no authorization)', done => {
    request
      .get('/native/events')
      .expect(401)
      .end(err => {
        done(err)
      })
  })

  it('Get events (no provider_id)', done => {
    request
      .get('/native/events')
      .set('Authorization', NO_PROVIDER_ID)
      .expect(400)
      .end(err => {
        done(err)
      })
  })

  it('Get events', done => {
    request
      .get('/native/events')
      .set('Authorization', ADMIN_AUTH)
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('data')
        done(err)
      })
  })
})

after('Shutting down Database', done => {
  request
    .get('/native/test/shutdown')
    .set('Authorization', ADMIN_AUTH)
    .expect(200)
    .end((err, result) => {
      test.value(result).hasHeader('content-type', APP_JSON)
      done(err)
    })
})
