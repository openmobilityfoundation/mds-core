import areas, { ServiceArea } from 'ladot-service-areas'
import Sinon from 'sinon'
import assert from 'assert'
import { AgencyApiRequest, AgencyApiResponse } from '../types'
import { getAllServiceAreas } from '../request-handlers'

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Agency API request handlers', () => {
  describe('Get all service areas', () => {
    it('Gets all service areas', async () => {
      const serviceAreas: ServiceArea[] = [
        {
          start_date: 0,
          end_date: null,
          prev_area: null,
          replacement_area: null,
          type: 'unrestricted',
          description: 'Los Angeles',
          area: {} as any
        }
      ]
      Sinon.replace(areas, 'readServiceAreas', Sinon.fake.resolves(serviceAreas))
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      await getAllServiceAreas({} as AgencyApiRequest, res)
      assert.equal(statusHandler.calledWith(200), true)
      assert.equal(sendHandler.calledWith({ service_areas: serviceAreas }), true)
    })
  })
})
