import test from 'unit.js'
import uuid from 'uuid'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import { ConnectionManager } from '../connection'
import { DeviceEntity } from '../entities/DeviceEntity'

const records = 10_000
const recorded = Date.now()

const manager = ConnectionManager(DeviceEntity)

export default () =>
  describe('Write/Read Devices', () => {
    it(records > 1 ? `Write ${records} Device(s)` : 'Write Device', async () => {
      const connection = await manager.getConnection('rw')
      const devices = Array.from({ length: records }, (_, index) => ({
        device_id: uuid(),
        provider_id: MOCHA_PROVIDER_ID,
        vehicle_id: `${Math.random()
          .toString(36)
          .substr(2, 3)
          .toUpperCase()}-${index.toString().padStart(6, '0')}`,
        type: 'scooter',
        propulsion: ['electric', 'human'],
        year: 2019,
        mfgr: 'ScootFast',
        recorded
      }))
      try {
        const repository = connection.getRepository(DeviceEntity)
        await repository.save(devices, { chunk: 5000 })
        test.value(devices.length).is(records)
      } finally {
        await connection.close()
      }
    })

    it(records > 1 ? `Read ${records} Device(s)` : 'Read Device', async () => {
      const connection = await manager.getConnection('ro')
      try {
        const devices = await connection.manager.find(DeviceEntity, { where: { recorded }, order: { id: 'ASC' } })
        test.value(devices.length).is(records)
      } finally {
        await connection.close()
      }
    })
  })
