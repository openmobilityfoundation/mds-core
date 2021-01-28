/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import db from '@mds-core/mds-db'
import Sinon from 'sinon'
import { DailyApiResponse, DailyApiGetRawTripDataRequest } from '../types'
import { getRawTripData } from '../request-handlers'

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Request handlers', () => {
  describe('getRawTripData()', () => {
    it('handles a db read error in getRawTripData()', async () => {
      Sinon.replace(db, 'readEvents', Sinon.fake.rejects('fake-db-error'))
      const res: DailyApiResponse = {} as DailyApiResponse
      res.status = (code: number) => {
        return {
          send: () => code
        } as any
      }
      await getRawTripData(
        {
          params: { trip_id: 'fake-trip-id' }
        } as DailyApiGetRawTripDataRequest,
        res as DailyApiResponse
      )
      Sinon.restore()
    })
  })
})
