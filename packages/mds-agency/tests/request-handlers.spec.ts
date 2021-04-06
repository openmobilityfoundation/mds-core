import Sinon from 'sinon'
import assert from 'assert'
import { uuid } from '@mds-core/mds-utils'
import { Device, VEHICLE_TYPES } from '@mds-core/mds-types'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-agency-cache'
import stream from '@mds-core/mds-stream'
import {
  AgencyApiRequest,
  AgencyApiResponse,
  AgencyApiGetVehiclesByProviderResponse,
  AgencyApiGetVehicleByIdRequest,
  AgencyApiUpdateVehicleRequest,
  AgencyApiRegisterVehicleRequest,
  AgencyApiGetVehiclesByProviderRequest
} from '../types'
import {
  registerVehicle,
  getVehicleById,
  getVehiclesByProvider,
  updateVehicleFail,
  updateVehicle
} from '../request-handlers'
import * as utils from '../utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

function getLocals(provider_id: string) {
  return { provider_id, scopes: [] }
}

describe('Agency API request handlers', () => {
  describe('Register vehicle', () => {
    const getFakeBody = () => {
      const device_id = uuid()
      const vehicle_id = uuid()
      const vehicle_type: Device['vehicle_type'] = VEHICLE_TYPES.car
      const propulsion_types: Device['propulsion_types'] = ['combustion']
      const body = {
        device_id,
        vehicle_id,
        vehicle_type,
        propulsion_types,
        year: 1990,
        mfgr: 'foo inc',
        model: 'i date one'
      }
      return body
    }

    it('Fails for a bad device', async () => {
      const provider_id = uuid()
      const body = getFakeBody()
      body.device_id = '' // falsey empty string FTW
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      await registerVehicle({ body } as AgencyApiRegisterVehicleRequest, res)
      assert.equal(statusHandler.calledWith(400), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })

    it('Handles db write failure gracefully', async () => {
      const provider_id = uuid()
      const body = getFakeBody()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(db, 'writeDevice', Sinon.fake.rejects('fake-rejects-db'))
      await registerVehicle({ body } as AgencyApiRegisterVehicleRequest, res)
      assert.equal(statusHandler.calledWith(500), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })

    it('Handles misc. write failure gracefully', async () => {
      const provider_id = uuid()
      const body = getFakeBody()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(db, 'writeDevice', Sinon.fake.rejects('fake-rejects-other'))
      await registerVehicle({ body } as AgencyApiRegisterVehicleRequest, res)
      assert.equal(statusHandler.calledWith(500), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })

    it('Handles duplicate gracefully', async () => {
      const provider_id = uuid()
      const body = getFakeBody()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(db, 'writeDevice', Sinon.fake.rejects('fake-rejects-duplicate'))
      await registerVehicle({ body } as AgencyApiRegisterVehicleRequest, res)
      assert.equal(statusHandler.calledWith(409), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })

    it('Inserts device successfully', async () => {
      const provider_id = uuid()
      const body = getFakeBody()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(db, 'writeDevice', Sinon.fake.resolves('it-worked'))
      Sinon.replace(cache, 'writeDevice', Sinon.fake.resolves('it-worked'))
      Sinon.replace(stream, 'writeDevice', Sinon.fake.resolves('it-worked'))
      await registerVehicle({ body } as AgencyApiRegisterVehicleRequest, res)
      assert.equal(statusHandler.calledWith(201), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })

    it('Handles cache/stream write errors as warnings', async () => {
      const provider_id = uuid()
      const body = getFakeBody()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(db, 'writeDevice', Sinon.fake.resolves('it-worked'))
      Sinon.replace(cache, 'writeDevice', Sinon.fake.rejects('it-broke'))
      Sinon.replace(stream, 'writeDevice', Sinon.fake.resolves('it-worked'))
      await registerVehicle({ body } as AgencyApiRegisterVehicleRequest, res)
      assert.equal(statusHandler.calledWith(201), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })
  })

  describe('Get vehicle by id', () => {
    it('Fails to read device', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(db, 'readDevice', Sinon.fake.rejects('it-broke'))
      Sinon.replace(db, 'readEvent', Sinon.fake.resolves('it-worked'))
      Sinon.replace(db, 'readTelemetry', Sinon.fake.resolves('it-worked'))
      await getVehicleById(
        ({
          params: { device_id },
          query: { cached: false }
        } as unknown) as AgencyApiGetVehicleByIdRequest,
        res
      )
      assert.equal(statusHandler.calledWith(404), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })

    it('Reads device data and returns composite', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(
        db,
        'readDevice',
        Sinon.fake.resolves({
          provider_id
        })
      )
      Sinon.replace(db, 'readEvent', Sinon.fake.resolves({}))
      Sinon.replace(db, 'readTelemetry', Sinon.fake.resolves({}))
      Sinon.replace(utils, 'computeCompositeVehicleData', Sinon.fake.resolves('it-worked'))
      await getVehicleById(
        ({
          params: { device_id },
          query: { cached: false }
        } as unknown) as AgencyApiGetVehicleByIdRequest,
        res
      )
      assert.equal(statusHandler.calledWith(200), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })
  })

  describe('Get vehicles by provider', () => {
    it('Handles failure to get vehicles by provider', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(utils, 'getVehicles', Sinon.fake.rejects('it-broke'))
      await getVehiclesByProvider(
        ({
          params: { device_id },
          query: { cached: false },
          get: Sinon.fake.returns('foo') as any
        } as unknown) as AgencyApiGetVehiclesByProviderRequest,
        res
      )
      assert.equal(statusHandler.calledWith(500), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })

    it('Gets vehicles by provider', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const res: AgencyApiGetVehiclesByProviderResponse = {} as AgencyApiGetVehiclesByProviderResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any

      const stubbedResponse = { total: 0, links: { first: '0', last: '0', prev: null, next: null }, vehicles: [] }
      Sinon.replace(utils, 'getVehicles', Sinon.fake.resolves(stubbedResponse))
      await getVehiclesByProvider(
        ({
          params: { device_id },
          query: { cached: false },
          get: Sinon.fake.returns('foo') as any
        } as unknown) as AgencyApiGetVehiclesByProviderRequest,
        res
      )
      assert.equal(statusHandler.calledWith(200), true)
      assert.equal(sendHandler.calledWith({ ...stubbedResponse }), true)
      Sinon.restore()
    })
  })

  describe('Update vehicle', () => {
    describe('Failure handler helper', () => {
      it('Fails to find data', async () => {
        const provider_id = uuid()
        const device_id = uuid()
        const res: AgencyApiResponse = {} as AgencyApiResponse
        const sendHandler = Sinon.fake.returns('asdf')
        const statusHandler = Sinon.fake.returns({
          send: sendHandler
        } as any)
        res.status = statusHandler
        res.locals = getLocals(provider_id) as any
        Sinon.replace(utils, 'getVehicles', Sinon.fake.rejects('it-broke'))
        await updateVehicleFail(
          ({
            params: { device_id },
            query: { cached: false },
            get: Sinon.fake.returns('foo') as any
          } as unknown) as AgencyApiUpdateVehicleRequest,
          res,
          provider_id,
          device_id,
          'not found'
        )
        assert.equal(statusHandler.calledWith(404), true)
        assert.equal(sendHandler.called, true)
        Sinon.restore()
      })

      it('Handles invalid data', async () => {
        const provider_id = uuid()
        const device_id = uuid()
        const res: AgencyApiResponse = {} as AgencyApiResponse
        const sendHandler = Sinon.fake.returns('asdf')
        const statusHandler = Sinon.fake.returns({
          send: sendHandler
        } as any)
        res.status = statusHandler
        res.locals = getLocals(provider_id) as any
        Sinon.replace(utils, 'getVehicles', Sinon.fake.rejects('it-broke'))
        await updateVehicleFail(
          ({
            params: { device_id },
            query: { cached: false },
            get: Sinon.fake.returns('foo') as any
          } as unknown) as AgencyApiUpdateVehicleRequest,
          res,
          provider_id,
          device_id,
          'invalid'
        )
        assert.equal(statusHandler.calledWith(400), true)
        assert.equal(
          sendHandler.calledWith({
            error: 'bad_param',
            error_description: 'Invalid parameters for vehicle were sent'
          }),
          true
        )
        Sinon.restore()
      })

      it('404s with no provider_id', async () => {
        const provider_id = ''
        const device_id = uuid()
        const res: AgencyApiResponse = {} as AgencyApiResponse
        const sendHandler = Sinon.fake.returns('asdf')
        const statusHandler = Sinon.fake.returns({
          send: sendHandler
        } as any)
        res.status = statusHandler
        res.locals = getLocals(provider_id) as any
        Sinon.replace(utils, 'getVehicles', Sinon.fake.rejects('it-broke'))
        await updateVehicleFail(
          ({
            params: { device_id },
            query: { cached: false },
            get: Sinon.fake.returns('foo') as any
          } as unknown) as AgencyApiUpdateVehicleRequest,
          res,
          provider_id,
          device_id,
          'not found'
        )
        assert.equal(statusHandler.calledWith(404), true)
        assert.equal(sendHandler.called, true)
        Sinon.restore()
      })

      it('handles misc error', async () => {
        const provider_id = uuid()
        const device_id = uuid()
        const res: AgencyApiResponse = {} as AgencyApiResponse
        const sendHandler = Sinon.fake.returns('asdf')
        const statusHandler = Sinon.fake.returns({
          send: sendHandler
        } as any)
        res.status = statusHandler
        res.locals = getLocals(provider_id) as any
        Sinon.replace(utils, 'getVehicles', Sinon.fake.rejects('it-broke'))
        await updateVehicleFail(
          ({
            params: { device_id },
            query: { cached: false },
            get: Sinon.fake.returns('foo') as any
          } as unknown) as AgencyApiUpdateVehicleRequest,
          res,
          provider_id,
          device_id,
          'misc-error'
        )
        assert.equal(statusHandler.calledWith(500), true)
        assert.equal(sendHandler.called, true)
        Sinon.restore()
      })
    })

    it('Handles failure to update vehicle', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(utils, 'getVehicles', Sinon.fake.rejects('it-broke'))
      await getVehiclesByProvider(
        ({
          params: { device_id },
          query: { cached: false },
          get: Sinon.fake.returns('foo') as any
        } as unknown) as AgencyApiRequest,
        res
      )
      assert.equal(statusHandler.calledWith(500), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })

    it('Fails to read vehicle', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const vehicle_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(db, 'readDevice', Sinon.fake.rejects('it-broke'))
      await updateVehicle(
        ({
          params: { device_id },
          query: { cached: false },
          get: Sinon.fake.returns('foo') as any,
          body: { vehicle_id }
        } as unknown) as AgencyApiUpdateVehicleRequest,
        res
      )
      assert.equal(statusHandler.calledWith(404), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })

    it('Handles mismatched provider', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const vehicle_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(db, 'readDevice', Sinon.fake.resolves({ provider_id: 'not-your-provider' }))
      await updateVehicle(
        ({
          params: { device_id },
          query: { cached: false },
          get: Sinon.fake.returns('foo') as any,
          body: { vehicle_id }
        } as unknown) as AgencyApiUpdateVehicleRequest,
        res
      )
      assert.equal(statusHandler.calledWith(404), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })

    it('Updates vehicle successfully', async () => {
      const provider_id = uuid()
      const device_id = uuid()
      const vehicle_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      res.locals = getLocals(provider_id) as any
      Sinon.replace(db, 'readDevice', Sinon.fake.resolves({ provider_id }))
      Sinon.replace(db, 'updateDevice', Sinon.fake.resolves({ provider_id }))
      Sinon.replace(cache, 'writeDevice', Sinon.fake.resolves({ provider_id }))
      Sinon.replace(stream, 'writeDevice', Sinon.fake.resolves({ provider_id }))
      await updateVehicle(
        ({
          params: { device_id },
          query: { cached: false },
          get: Sinon.fake.returns('foo') as any,
          body: { vehicle_id }
        } as unknown) as AgencyApiUpdateVehicleRequest,
        res
      )
      assert.equal(statusHandler.calledWith(201), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })
  })
})
