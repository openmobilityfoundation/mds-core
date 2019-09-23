import areas, { ServiceArea } from 'ladot-service-areas'
import Sinon from 'sinon'
import assert from 'assert'
import uuid from 'uuid'
import { Device } from 'packages/mds-types'
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import stream from '@mds-core/mds-stream'
import { AgencyApiRequest, AgencyApiResponse } from '../types'
import { getAllServiceAreas, getServiceAreaById, registerVehicle } from '../request-handlers'
import * as utils from '../utils'

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
      Sinon.restore()
    })

    it('Handles a service area read exception', async () => {
      Sinon.replace(areas, 'readServiceAreas', Sinon.fake.rejects('fake-rejects'))
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      await getAllServiceAreas({} as AgencyApiRequest, res)
      assert.equal(statusHandler.calledWith(404), true)
      assert.equal(sendHandler.calledWith({ result: 'not found' }), true)
      Sinon.restore()
    })
  })

  describe('Get service area by id', () => {
    it('Gets service area by id', async () => {
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
      const service_area_id = uuid()
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      await getServiceAreaById({ params: { service_area_id } } as AgencyApiRequest, res)
      assert.equal(statusHandler.calledWith(200), true)
      assert.equal(sendHandler.calledWith({ service_areas: serviceAreas }), true)
      Sinon.restore()
    })

    it('Handles a service area read exception', async () => {
      Sinon.replace(areas, 'readServiceAreas', Sinon.fake.rejects('fake-rejects'))
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const service_area_id = uuid()
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      await getServiceAreaById({ params: { service_area_id } } as AgencyApiRequest, res)
      assert.equal(statusHandler.calledWith(404), true)
      assert.equal(sendHandler.calledWith({ result: `${service_area_id} not found` }), true)
      Sinon.restore()
    })

    it('Handles no service areas found gracefully', async () => {
      Sinon.replace(areas, 'readServiceAreas', Sinon.fake.resolves([]))
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const service_area_id = uuid()
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      await getServiceAreaById({ params: { service_area_id } } as AgencyApiRequest, res)
      assert.equal(statusHandler.calledWith(404), true)
      assert.equal(sendHandler.calledWith({ result: `${service_area_id} not found` }), true)
      Sinon.restore()
    })

    it('Handles a non-uuid service area id gracefully', async () => {
      Sinon.replace(areas, 'readServiceAreas', Sinon.fake.rejects('fake-rejects'))
      const res: AgencyApiResponse = {} as AgencyApiResponse
      const service_area_id = 'not-a-uuid'
      const sendHandler = Sinon.fake.returns('asdf')
      const statusHandler = Sinon.fake.returns({
        send: sendHandler
      } as any)
      res.status = statusHandler
      await getServiceAreaById({ params: { service_area_id } } as AgencyApiRequest, res)
      assert.equal(statusHandler.calledWith(400), true)
      assert.equal(sendHandler.calledWith({ result: `invalid service_area_id ${service_area_id} is not a UUID` }), true)
      Sinon.restore()
    })
  })

  describe('Register vehicle', () => {
    const getFakeBody = () => {
      const device_id = uuid()
      const vehicle_id = uuid()
      const type: Device['type'] = 'car'
      const propulsion: Device['propulsion'] = ['combustion']
      const body = {
        device_id,
        vehicle_id,
        type,
        propulsion,
        year: 1990,
        mfgr: 'foo inc.',
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
      res.locals = { provider_id } as any
      await registerVehicle({ body } as AgencyApiRequest, res)
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
      res.locals = { provider_id } as any
      Sinon.replace(db, 'writeDevice', Sinon.fake.rejects('fake-rejects-db'))
      await registerVehicle({ body } as AgencyApiRequest, res)
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
      res.locals = { provider_id } as any
      Sinon.replace(db, 'writeDevice', Sinon.fake.rejects('fake-rejects-other'))
      await registerVehicle({ body } as AgencyApiRequest, res)
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
      res.locals = { provider_id } as any
      Sinon.replace(db, 'writeDevice', Sinon.fake.rejects('fake-rejects-duplicate'))
      await registerVehicle({ body } as AgencyApiRequest, res)
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
      res.locals = { provider_id } as any
      Sinon.replace(db, 'writeDevice', Sinon.fake.resolves('it-worked'))
      Sinon.replace(cache, 'writeDevice', Sinon.fake.resolves('it-worked'))
      Sinon.replace(stream, 'writeDevice', Sinon.fake.resolves('it-worked'))
      Sinon.replace(utils, 'writeRegisterEvent', Sinon.fake.resolves('it-worked'))
      await registerVehicle({ body } as AgencyApiRequest, res)
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
      res.locals = { provider_id } as any
      Sinon.replace(db, 'writeDevice', Sinon.fake.resolves('it-worked'))
      Sinon.replace(cache, 'writeDevice', Sinon.fake.rejects('it-broke'))
      Sinon.replace(stream, 'writeDevice', Sinon.fake.resolves('it-worked'))
      Sinon.replace(utils, 'writeRegisterEvent', Sinon.fake.resolves('it-worked'))
      await registerVehicle({ body } as AgencyApiRequest, res)
      assert.equal(statusHandler.calledWith(201), true)
      assert.equal(sendHandler.called, true)
      Sinon.restore()
    })
  })
})
