/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/always-return */
/* eslint-disable promise/no-nesting */
/* eslint-disable promise/no-callback-in-promise */

import supertest from 'supertest'
import { ApiServer } from '@mds-core/mds-api-server'
import test from 'unit.js'
import { TEST1_PROVIDER_ID } from '@mds-core/mds-providers'
import { PROVIDER_SCOPES, SCOPED_AUTH } from '@mds-core/mds-test-data'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import stream from '@mds-core/mds-stream'
import { api } from '../api'

const request = supertest(ApiServer(api))

const AUTH = SCOPED_AUTH([PROVIDER_SCOPES], TEST1_PROVIDER_ID)
const AUTH_NO_SCOPE = SCOPED_AUTH([], TEST1_PROVIDER_ID)

before(async () => {
  await Promise.all([db.initialize(), cache.initialize(), stream.initialize()])
})

after(async () => {
  await Promise.all([db.shutdown(), cache.shutdown(), stream.shutdown()])
})

describe('Tests API Scope Rejections', () => {
  it('verifies unable to access state_snapshot if not scoped', done => {
    request
      .get('/state_snapshot')
      .set('Authorization', AUTH_NO_SCOPE)
      .expect(403)
      .end((err, result) => {
        test.string(result.body.error.reason).is('no access without scope')
        done(err)
      })
  })

  it('verifies unable to access event_snapshot if not scoped', done => {
    request
      .get('/event_snapshot')
      .set('Authorization', AUTH_NO_SCOPE)
      .expect(403)
      .end((err, result) => {
        test.string(result.body.error.reason).is('no access without scope')
        done(err)
      })
  })

  it('verifies unable to access telemetry_counts if not scoped', done => {
    request
      .get('/telemetry_counts')
      .set('Authorization', AUTH_NO_SCOPE)
      .expect(403)
      .end((err, result) => {
        test.string(result.body.error.reason).is('no access without scope')
        done(err)
      })
  })

  it('verifies unable to access event_counts if not scoped', done => {
    request
      .get('/event_counts')
      .set('Authorization', AUTH_NO_SCOPE)
      .expect(403)
      .end((err, result) => {
        test.string(result.body.error.reason).is('no access without scope')
        done(err)
      })
  })
})

describe('Tests API Scope Access', () => {
  it('verifies access to state_snapshot if scoped', done => {
    request
      .get('/state_snapshot')
      .set('Authorization', AUTH)
      .expect(200)
      .end(err => {
        done(err)
      })
  })

  it('verifies access to event_snapshot if scoped', done => {
    request
      .get('/event_snapshot')
      .set('Authorization', AUTH)
      .expect(200)
      .end(err => {
        done(err)
      })
  })

  it('verifies access to telemetry_counts if scoped', done => {
    request
      .get('/telemetry_counts')
      .set('Authorization', AUTH)
      .expect(200)
      .end(err => {
        done(err)
      })
  })

  it('verifies access to event_counts if scoped', done => {
    request
      .get('/event_counts')
      .set('Authorization', AUTH)
      .expect(200)
      .end(err => {
        done(err)
      })
  })
})
