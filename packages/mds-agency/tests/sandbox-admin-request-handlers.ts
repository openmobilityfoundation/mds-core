import Sinon from 'sinon'
import assert from 'assert'
import uuid from 'uuid'
import cache from '@mds-core/mds-cache'
import db from '@mds-core/mds-db'
import { AgencyApiRequest, AgencyApiResponse } from '../types'
import { getCacheInfo, wipeDevice, refreshCache } from '../sandbox-admin-request-handlers'
import * as utils from '../utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Sandbox admin request handlers', () => {
  describe('Gets cache info', () => {
    it('Gets cache info', async () => {
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      Sinon.replace(cache, 'info', Sinon.fake.resolves('it-worked'))
      await getCacheInfo({} as AgencyApiRequest, res)
      assert.equal(statusHandler.calledWith(200), true)
      Sinon.restore()
    })
    it('Fails to get cache info', async () => {
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      Sinon.replace(cache, 'info', Sinon.fake.rejects('it-failed'))
      await getCacheInfo({} as AgencyApiRequest, res)
      assert.equal(statusHandler.calledWith(500), true)
      Sinon.restore()
    })
  })
  describe('It wipes device', () => {
    it('Fails to wipe device', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = { provider_id } as any
      Sinon.replace(cache, 'wipeDevice', Sinon.fake.rejects('it-failed'))
      Sinon.replace(db, 'wipeDevice', Sinon.fake.rejects('it-failed'))
      await wipeDevice(
        {
          params: { device_id },
          query: { cached: false },
          get: Sinon.fake.returns('foo') as any
        } as AgencyApiRequest<{ device_id: string }>,
        res
      )
      assert.equal(statusHandler.calledWith(500), true)
      Sinon.restore()
    })
    it('Successfully wipes device', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = { provider_id } as any
      Sinon.replace(cache, 'wipeDevice', Sinon.fake.resolves(1))
      Sinon.replace(db, 'wipeDevice', Sinon.fake.resolves('it-worked'))
      await wipeDevice(
        {
          params: { device_id },
          query: { cached: false },
          get: Sinon.fake.returns('foo') as any
        } as AgencyApiRequest<{ device_id: string }>,
        res
      )
      assert.equal(statusHandler.calledWith(200), true)
      Sinon.restore()
    })
  })
  describe('Refresh cache', () => {
    it('Successfully refreshes cache', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = { provider_id } as any
      Sinon.replace(db, 'readDeviceIds', Sinon.fake.resolves([1]))
      Sinon.replace(utils, 'refresh', Sinon.fake.resolves([1]))
      await refreshCache(
        {
          params: { device_id },
          query: { cached: false },
          get: Sinon.fake.returns('foo') as any
        } as AgencyApiRequest<{ device_id: string }>,
        res
      )
      assert.equal(statusHandler.calledWith(200), true)
      // Sinon.replace(db, 'wipeDevice', Sinon.fake.resolves('it-worked'))
      Sinon.restore()
    })
    it('Fails to refreshes cache', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = { provider_id } as any
      Sinon.replace(db, 'readDeviceIds', Sinon.fake.rejects('it-fails'))
      Sinon.replace(utils, 'refresh', Sinon.fake.rejects('it-fails'))
      await refreshCache(
        {
          params: { device_id },
          query: { cached: false },
          get: Sinon.fake.returns('foo') as any
        } as AgencyApiRequest<{ device_id: string }>,
        res
      )
      assert.equal(statusHandler.calledWith(500), true)
      // Sinon.replace(db, 'wipeDevice', Sinon.fake.resolves('it-worked'))
      Sinon.restore()
    })
  })
})
