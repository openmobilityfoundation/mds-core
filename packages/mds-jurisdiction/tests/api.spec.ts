/*
    Copyright 2019-2020 City of Los Angeles.

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
import { ApiServer } from '@mds-core/mds-api-server'
import { v4 as uuid } from 'uuid'
import { JurisdictionServiceProvider } from '@mds-core/mds-jurisdiction-service/server'
import { SCOPED_AUTH } from '@mds-core/mds-test-data'
import { Jurisdiction } from '@mds-core/mds-types'
import { api } from '../api'
import { JURISDICTION_API_DEFAULT_VERSION } from '../types'

const request = supertest(ApiServer(api))

const [JURISDICTION0, JURISDICTION1, JURISDICTION2] = [uuid(), uuid(), uuid()].map(jurisdiction_id => ({
  jurisdiction_id,
  agency_key: `agency-key-${jurisdiction_id}`,
  agency_name: `Agency Name ${jurisdiction_id}`,
  geography_id: uuid()
}))

describe('', () => {
  before(async () => {
    await JurisdictionServiceProvider.start()
  })

  it('Create Single Jurisdiction', async () => {
    const result = await request
      .post('/jurisdictions')
      .set('Authorization', SCOPED_AUTH(['jurisdictions:write']))
      .send(JURISDICTION0)
      .expect(201)
    test.object(result.body).hasProperty('version', JURISDICTION_API_DEFAULT_VERSION)
    test.object(result.body.jurisdiction).hasProperty('timestamp')
    test.object(result.body.jurisdiction).hasProperty('jurisdiction_id', JURISDICTION0.jurisdiction_id)
  })

  it('Create Single Jurisdiction (forbidden)', async () => {
    await request.post('/jurisdictions').send(JURISDICTION0).expect(403)
  })

  it('Create Single Jurisdiction (conflict)', async () => {
    await request
      .post('/jurisdictions')
      .set('Authorization', SCOPED_AUTH(['jurisdictions:write']))
      .send(JURISDICTION0)
      .expect(409)
  })

  it('Create Single Jurisdiction (validation error)', async () => {
    const { agency_key, ...dto } = JURISDICTION1
    await request
      .post('/jurisdictions')
      .set('Authorization', SCOPED_AUTH(['jurisdictions:write']))
      .send(dto)
      .expect(400)
  })

  it('Create Multiple Jurisdictions', async () => {
    const result = await request
      .post('/jurisdictions')
      .set('Authorization', SCOPED_AUTH(['jurisdictions:write']))
      .send([JURISDICTION1, JURISDICTION2])
      .expect(201)
    test.object(result.body).hasProperty('version', JURISDICTION_API_DEFAULT_VERSION)
    test.object(result.body.jurisdictions).hasProperty('length', 2)
    test
      .value(result.body.jurisdictions.map((jurisdiction: Jurisdiction) => jurisdiction.jurisdiction_id))
      .is([JURISDICTION1.jurisdiction_id, JURISDICTION2.jurisdiction_id])
  })

  it('Update Single Jurisdiction (validation error)', async () => {
    await request
      .put(`/jurisdictions/${JURISDICTION1.jurisdiction_id}`)
      .set('Authorization', SCOPED_AUTH(['jurisdictions:write']))
      .send({ ...JURISDICTION1, jurisdiction_id: uuid() })
      .expect(400)
  })

  it('Update Single Jurisdiction (not found)', async () => {
    await request
      .put(`/jurisdictions/${uuid()}`)
      .set('Authorization', SCOPED_AUTH(['jurisdictions:write']))
      .expect(404)
  })

  it('Update Single Jurisdiction', async () => {
    const updated_agency_key = `${JURISDICTION1.agency_key}-updated`
    const result = await request
      .put(`/jurisdictions/${JURISDICTION1.jurisdiction_id}`)
      .set('Authorization', SCOPED_AUTH(['jurisdictions:write']))
      .send({ ...JURISDICTION1, agency_key: updated_agency_key })
      .expect(200)
    test.object(result.body).hasProperty('version', JURISDICTION_API_DEFAULT_VERSION)
    test.object(result.body.jurisdiction).hasProperty('jurisdiction_id', JURISDICTION1.jurisdiction_id)
    test.object(result.body.jurisdiction).hasProperty('agency_key', updated_agency_key)
  })

  it('Get One Jurisdiction', async () => {
    const result = await request
      .get(`/jurisdictions/${JURISDICTION2.jurisdiction_id}`)
      .set('Authorization', SCOPED_AUTH(['jurisdictions:read']))
      .expect(200)
    test.object(result.body).hasProperty('version', JURISDICTION_API_DEFAULT_VERSION)
    test.object(result.body.jurisdiction).hasProperty('jurisdiction_id', JURISDICTION2.jurisdiction_id)
  })

  it('Get One Jurisdiction (no scope)', async () => {
    await request.get(`/jurisdictions/${JURISDICTION2.jurisdiction_id}`).expect(403)
  })

  it('Get One Jurisdiction (incorrect jurisdiction claim)', async () => {
    await request
      .get(`/jurisdictions/${JURISDICTION2.jurisdiction_id}`)
      .set('Authorization', SCOPED_AUTH(['jurisdictions:read:claim'], JURISDICTION1.agency_key))
      .expect(403)
  })

  it('Get One Jurisdiction (proper jurisdiction claim)', async () => {
    const result = await request
      .get(`/jurisdictions/${JURISDICTION2.jurisdiction_id}`)
      .set('Authorization', SCOPED_AUTH(['jurisdictions:read:claim'], JURISDICTION2.agency_key))
      .expect(200)
    test.object(result.body).hasProperty('version', JURISDICTION_API_DEFAULT_VERSION)
    test.object(result.body.jurisdiction).hasProperty('jurisdiction_id', JURISDICTION2.jurisdiction_id)
  })

  it('Get Multiple Jurisdictions', async () => {
    const result = await request
      .get('/jurisdictions')
      .set('Authorization', SCOPED_AUTH(['jurisdictions:read']))
      .expect(200)
    test.object(result.body).hasProperty('version', JURISDICTION_API_DEFAULT_VERSION)
    test
      .value(
        (result.body.jurisdictions as Jurisdiction[])
          .map(jurisdiction => jurisdiction.jurisdiction_id)
          .filter(jurisdiction_id =>
            [JURISDICTION0, JURISDICTION1, JURISDICTION2]
              .map(jurisdiction => jurisdiction.jurisdiction_id)
              .includes(jurisdiction_id)
          ).length
      )
      .is(3)
  })

  it('Get Multiple Jurisdictions (no scope)', async () => {
    await request.get('/jurisdictions').expect(403)
  })

  it('Get Multiple Jurisdictions (no jurisdictions claim)', async () => {
    const result = await request
      .get('/jurisdictions')
      .set('Authorization', SCOPED_AUTH(['jurisdictions:read:claim']))
      .expect(200)
    test.object(result.body).hasProperty('version', JURISDICTION_API_DEFAULT_VERSION)
    test.value((result.body.jurisdictions as Jurisdiction[]).length).is(0)
  })

  it('Get Multiple Jurisdictions (jurisdictions claim)', async () => {
    const result = await request
      .get('/jurisdictions')
      .set('Authorization', SCOPED_AUTH(['jurisdictions:read:claim'], JURISDICTION2.agency_key))
      .expect(200)
    test.object(result.body).hasProperty('version', JURISDICTION_API_DEFAULT_VERSION)
    test.value((result.body.jurisdictions as Jurisdiction[]).length).is(1)
  })

  it('Delete One Jurisdiction', async () => {
    const result = await request
      .delete(`/jurisdictions/${JURISDICTION1.jurisdiction_id}`)
      .set('Authorization', SCOPED_AUTH(['jurisdictions:write']))
      .expect(200)
    test.object(result.body).hasProperty('jurisdiction_id', JURISDICTION1.jurisdiction_id)
  })

  it('Delete One Jurisdiction (not found)', async () => {
    await request
      .delete(`/jurisdictions/${JURISDICTION1.jurisdiction_id}`)
      .set('Authorization', SCOPED_AUTH(['jurisdictions:write']))
      .expect(404)
  })

  it('Get One Jurisdiction (not found)', async () => {
    await request
      .get(`/jurisdictions/${JURISDICTION1.jurisdiction_id}`)
      .set('Authorization', SCOPED_AUTH(['jurisdictions:read']))
      .expect(404)
  })

  after(async () => {
    await JurisdictionServiceProvider.stop()
  })
})
