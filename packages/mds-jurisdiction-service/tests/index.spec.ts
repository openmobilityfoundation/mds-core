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

import test from 'unit.js'
import { v4 as uuid } from 'uuid'
import { NotFoundError, ValidationError, days, ConflictError } from '@mds-core/mds-utils'
import { JurisdictionServiceProvider } from '../server'

const records = 5_000

const JURISDICTION_ID = uuid()
const TODAY = Date.now()
const YESTERDAY = TODAY - days(1)
const LAST_WEEK = TODAY - days(7)

describe('Write/Read Jurisdictions', () => {
  before(async () => {
    await JurisdictionServiceProvider.start()
  })

  it(`Write ${records} Jurisdiction${records > 1 ? 's' : ''}`, async () => {
    const [error, jurisdictions] = await JurisdictionServiceProvider.createJurisdictions(
      Array.from({ length: records }, (_, index) => ({
        jurisdiction_id: index ? uuid() : JURISDICTION_ID,
        agency_key: `agency-key-${index}`,
        agency_name: `Agency Name ${index}`,
        timestamp: YESTERDAY,
        geography_id: uuid()
      }))
    )
    test.value(jurisdictions).isNot(null)
    test.value(jurisdictions?.[0].jurisdiction_id).is(JURISDICTION_ID)
    test.value(error).is(null)
  })

  it(`Read ${records} Jurisdiction${records > 1 ? 's' : ''}`, async () => {
    const [error, jurisdictions] = await JurisdictionServiceProvider.getJurisdictions()
    test.value(jurisdictions).isNot(null)
    test.value(jurisdictions?.length).is(records)
    test.value(jurisdictions?.[0].jurisdiction_id).is(JURISDICTION_ID)
    test.value(error).is(null)
  })

  it('Write One Jurisdiction', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.createJurisdiction({
      agency_key: 'agency-key-one',
      agency_name: 'Agency Name One',
      geography_id: uuid()
    })
    test.value(jurisdiction).isNot(null)
    test.value(jurisdiction?.jurisdiction_id).isNot(null)
    test.value(jurisdiction?.timestamp).isNot(null)
    test.value(error).is(null)
  })

  it('Write One Jurisdiction (duplicate id)', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.createJurisdiction({
      jurisdiction_id: JURISDICTION_ID,
      agency_key: 'agency-key-two',
      agency_name: 'Agency Name One',
      geography_id: uuid()
    })
    test.value(error).isNot(null).isInstanceOf(ConflictError)
    test.value(jurisdiction).is(null)
  })

  it('Write One Jurisdiction (duplicate key)', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.createJurisdiction({
      agency_key: 'agency-key-one',
      agency_name: 'Agency Name One',
      geography_id: uuid()
    })
    test.value(error).isNot(null).isInstanceOf(ConflictError)
    test.value(jurisdiction).is(null)
  })

  it('Write One Jurisdiction (validation error)', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.createJurisdiction({
      agency_key: '',
      agency_name: 'Agency Name One',
      geography_id: uuid()
    })
    test.value(error).isNot(null).isInstanceOf(ValidationError)
    test.value(jurisdiction).is(null)
  })

  it('Update One Jurisdiction (invalid jurisdiction_id)', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.updateJurisdiction(JURISDICTION_ID, {
      jurisdiction_id: uuid(),
      agency_name: 'Some New Name',
      timestamp: TODAY
    })
    test.value(error).isNot(null).isInstanceOf(ValidationError)
    test.value(jurisdiction).is(null)
  })

  it('Update One Jurisdiction (invalid timestamp)', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.updateJurisdiction(JURISDICTION_ID, {
      agency_name: 'Some New Name',
      timestamp: LAST_WEEK
    })
    test.value(error).isNot(null).isInstanceOf(ValidationError)
    test.value(jurisdiction).is(null)
  })

  it('Update One Jurisdiction (not found)', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.updateJurisdiction(uuid(), {
      agency_name: 'Some New Name',
      timestamp: TODAY
    })
    test.value(error).isNot(null).isInstanceOf(NotFoundError)
    test.value(jurisdiction).is(null)
  })

  it('Update One Jurisdiction', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.updateJurisdiction(JURISDICTION_ID, {
      agency_name: 'Some New Name',
      timestamp: TODAY
    })
    test.value(jurisdiction).isNot(null)
    test.value(jurisdiction?.jurisdiction_id).is(JURISDICTION_ID)
    test.value(jurisdiction?.timestamp).is(TODAY)
    test.value(error).is(null)
  })

  it('Read Specific Jurisdiction (current version)', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.getJurisdiction(JURISDICTION_ID)
    test.value(jurisdiction).isNot(null)
    test.value(jurisdiction?.jurisdiction_id).is(JURISDICTION_ID)
    test.value(jurisdiction?.timestamp).is(TODAY)
    test.value(error).is(null)
  })

  it('Read Specific Jurisdiction (prior version)', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.getJurisdiction(JURISDICTION_ID, {
      effective: YESTERDAY
    })
    test.value(jurisdiction).isNot(null)
    test.value(jurisdiction?.jurisdiction_id).is(JURISDICTION_ID)
    test.value(jurisdiction?.timestamp).is(YESTERDAY)
    test.value(error).is(null)
  })

  it('Read Specific Jurisdiction (no version)', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.getJurisdiction(JURISDICTION_ID, {
      effective: LAST_WEEK
    })
    test.value(error).isNot(null).isInstanceOf(NotFoundError)
    test.value(jurisdiction).is(null)
  })

  it('Read Missing Jurisdiction', async () => {
    const [error, jurisdiction] = await JurisdictionServiceProvider.getJurisdiction(uuid())
    test.value(error).isNot(null).isInstanceOf(NotFoundError)
    test.value(jurisdiction).is(null)
  })

  it('Delete One Jurisdiction', async () => {
    const [error, result] = await JurisdictionServiceProvider.deleteJurisdiction(JURISDICTION_ID)
    test.value(result).isNot(null)
    test.value(result?.jurisdiction_id).is(JURISDICTION_ID)
    test.value(error).is(null)
  })

  it('Delete One Jurisdiction (not found)', async () => {
    const [error, result] = await JurisdictionServiceProvider.deleteJurisdiction(JURISDICTION_ID)
    test.value(error).isNot(null).isInstanceOf(NotFoundError)
    test.value(result).is(null)
  })

  after(async () => {
    await JurisdictionServiceProvider.stop()
  })
})
