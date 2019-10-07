import db from '@mds-core/mds-db'
import Sinon from 'sinon'
import { DailyApiRequest, DailyApiResponse } from '../types'
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
        } as DailyApiRequest,
        res as DailyApiResponse
      )
      Sinon.restore()
    })
  })
})
