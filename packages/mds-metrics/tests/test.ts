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
import { PROVIDER_SCOPES, SCOPED_AUTH, makeDevices, makeEventsWithTelemetry } from '@mds-core/mds-test-data'
import { now } from '@mds-core/mds-utils'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import stream from '@mds-core/mds-stream'
import { Telemetry } from 'packages/mds-types'
import { api } from '../api'
import { StateSnapshotResponse } from '../types'

const request = supertest(ApiServer(api))

const AUTH = SCOPED_AUTH([PROVIDER_SCOPES], TEST1_PROVIDER_ID)
const AUTH_NO_SCOPE = SCOPED_AUTH([], TEST1_PROVIDER_ID)

const CITY_OF_LA = '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'

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

describe('Tests API', () => {
  const HALF_DAY_AGO = now() - 43200000
  before(async () => {
    const devices = makeDevices(15, HALF_DAY_AGO)
    const events = makeEventsWithTelemetry(devices, HALF_DAY_AGO, CITY_OF_LA, 'trip_start')
    const telem = events.reduce((acc: Telemetry[], e) => {
      const { telemetry } = e
      return [...acc, telemetry as Telemetry]
    }, [])

    const seedData = { devices, events, telemetry: telem }
    await Promise.all([db.seed(seedData), cache.seed(seedData)])
  })

  it('verifies valid response from state_snapshot', done => {
    request
      .get('/state_snapshot')
      .set('Authorization', AUTH)
      .expect(200)
      .end((err, result) => {
        result.body.forEach((res: StateSnapshotResponse) => {
          const { snapshot, slice } = res
          if (slice.end >= HALF_DAY_AGO) {
            test.assert(snapshot.bicycle.trip === 15)
          }
        })
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
