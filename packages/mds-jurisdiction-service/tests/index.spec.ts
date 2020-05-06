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
import { uuid, days } from '@mds-core/mds-utils'
import { handleServiceResponse } from '@mds-core/mds-service-helpers'
import { JurisdictionServiceProvider } from '../service/provider'

const records = 5_000

const JURISDICTION_ID = uuid()
const TODAY = Date.now()
const YESTERDAY = TODAY - days(1)
const LAST_WEEK = TODAY - days(7)

describe('Write/Read Jurisdictions', () => {
  before(async () => {
    await JurisdictionServiceProvider.initialize()
  })

  it(`Write ${records} Jurisdiction${records > 1 ? 's' : ''}`, async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.createJurisdictions(
        Array.from({ length: records }, (_, index) => ({
          jurisdiction_id: index ? uuid() : JURISDICTION_ID,
          agency_key: `agency-key-${index}`,
          agency_name: `Agency Name ${index}`,
          timestamp: YESTERDAY,
          geography_id: uuid()
        }))
      ),
      error => test.value(error).is(null),
      jurisdictions => test.value(jurisdictions[0].jurisdiction_id).is(JURISDICTION_ID)
    )
  })

  it(`Read ${records} Jurisdiction${records > 1 ? 's' : ''}`, async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.getJurisdictions(),
      error => test.value(error).is(null),
      jurisdictions => {
        test.value(jurisdictions.length).is(records)
        test.value(jurisdictions[0].jurisdiction_id).is(JURISDICTION_ID)
      }
    )
  })

  it('Write One Jurisdiction', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.createJurisdiction({
        agency_key: 'agency-key-one',
        agency_name: 'Agency Name One',
        geography_id: uuid()
      }),
      error => test.value(error).is(null),
      jurisdiction => {
        test.value(jurisdiction).isNot(null)
        test.value(jurisdiction.jurisdiction_id).isNot(null)
        test.value(jurisdiction.timestamp).isNot(null)
      }
    )
  })

  it('Write One Jurisdiction (duplicate id)', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.createJurisdiction({
        jurisdiction_id: JURISDICTION_ID,
        agency_key: 'agency-key-two',
        agency_name: 'Agency Name One',
        geography_id: uuid()
      }),
      error => test.value(error.type).is('ConflictError'),
      result => test.value(result).is(null)
    )
  })

  it('Write One Jurisdiction (duplicate key)', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.createJurisdiction({
        agency_key: 'agency-key-one',
        agency_name: 'Agency Name One',
        geography_id: uuid()
      }),
      error => test.value(error.type).is('ConflictError'),
      result => test.value(result).is(null)
    )
  })

  it('Write One Jurisdiction (validation error)', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.createJurisdiction({
        agency_key: '',
        agency_name: 'Agency Name One',
        geography_id: uuid()
      }),
      error => test.value(error.type).is('ValidationError'),
      result => test.value(result).is(null)
    )
  })

  it('Update One Jurisdiction (invalid jurisdiction_id)', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.updateJurisdiction(JURISDICTION_ID, {
        jurisdiction_id: uuid(),
        agency_name: 'Some New Name',
        timestamp: TODAY
      }),
      error => test.value(error.type).is('ConflictError'),
      result => test.value(result).is(null)
    )
  })

  it('Update One Jurisdiction (invalid timestamp)', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.updateJurisdiction(JURISDICTION_ID, {
        agency_name: 'Some New Name',
        timestamp: LAST_WEEK
      }),
      error => test.value(error.type).is('ValidationError'),
      result => test.value(result).is(null)
    )
  })

  it('Update One Jurisdiction (not found)', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.updateJurisdiction(uuid(), {
        agency_name: 'Some New Name',
        timestamp: TODAY
      }),
      error => test.value(error.type).is('NotFoundError'),
      result => test.value(result).is(null)
    )
  })

  it('Update One Jurisdiction', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.updateJurisdiction(JURISDICTION_ID, {
        agency_name: 'Some New Name',
        timestamp: TODAY
      }),
      error => test.value(error).is(null),
      jurisdiction => {
        test.value(jurisdiction).isNot(null)
        test.value(jurisdiction.jurisdiction_id).is(JURISDICTION_ID)
        test.value(jurisdiction.timestamp).is(TODAY)
      }
    )
  })

  it('Read Specific Jurisdiction (current version)', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.getJurisdiction(JURISDICTION_ID),
      error => test.value(error).is(null),
      jurisdiction => {
        test.value(jurisdiction).isNot(null)
        test.value(jurisdiction.jurisdiction_id).is(JURISDICTION_ID)
        test.value(jurisdiction.timestamp).is(TODAY)
      }
    )
  })

  it('Read Specific Jurisdiction (prior version)', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.getJurisdiction(JURISDICTION_ID, {
        effective: YESTERDAY
      }),
      error => test.value(error).is(null),
      jurisdiction => {
        test.value(jurisdiction).isNot(null)
        test.value(jurisdiction.jurisdiction_id).is(JURISDICTION_ID)
        test.value(jurisdiction.timestamp).is(YESTERDAY)
      }
    )
  })

  it('Read Specific Jurisdiction (no version)', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.getJurisdiction(JURISDICTION_ID, {
        effective: LAST_WEEK
      }),
      error => test.value(error.type).is('NotFoundError'),
      result => test.value(result).is(null)
    )
  })

  it('Read Missing Jurisdiction', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.getJurisdiction(uuid()),
      error => test.value(error.type).is('NotFoundError'),
      result => test.value(result).is(null)
    )
  })

  it('Delete One Jurisdiction', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.deleteJurisdiction(JURISDICTION_ID),
      error => test.value(error).is(null),
      jurisdiction => {
        test.value(jurisdiction).isNot(null)
        test.value(jurisdiction.jurisdiction_id).is(JURISDICTION_ID)
      }
    )
  })

  it('Delete One Jurisdiction (not found)', async () => {
    handleServiceResponse(
      await JurisdictionServiceProvider.deleteJurisdiction(JURISDICTION_ID),
      error => test.value(error.type).is('NotFoundError'),
      result => test.value(result).is(null)
    )
  })

  after(async () => {
    await JurisdictionServiceProvider.shutdown()
  })
})
