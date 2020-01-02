import Sinon from 'sinon'
import db from '@mds-core/mds-db'

import { getPolicies } from '../request-handlers'
import { mockReq, mockRes } from 'sinon-express-mock'

describe('Policy Author Request Handlers', () => {
  describe('getPolicies()', () => {
    afterEach(() => {
      Sinon.restore()
    })

    it('Gets all published policies', async () => {
      const req = mockReq({
        query: {
          get_published: true
        }
      })
      const res = mockRes()
      const fakeReadPolicies = Sinon.fake.resolves('fake')
      Sinon.replace(db, 'readPolicies', fakeReadPolicies)
      await getPolicies(req, res)
      Sinon.assert.calledWith(res.status.firstCall, 200)
      Sinon.assert.calledWith(fakeReadPolicies.firstCall, { get_published: true, get_unpublished: null })
    })

    it('Gets all unpublished policies', async () => {
      const req = mockReq({
        query: {
          get_unpublished: true
        }
      })
      const res = mockRes()
      const fakeReadPolicies = Sinon.fake.resolves('fake')
      Sinon.replace(db, 'readPolicies', fakeReadPolicies)
      await getPolicies(req, res)
      Sinon.assert.calledWith(res.status.firstCall, 200)
      Sinon.assert.calledWith(fakeReadPolicies.firstCall, { get_published: null, get_unpublished: true })
    })
  })
})