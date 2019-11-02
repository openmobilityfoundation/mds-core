import test from 'unit.js'
import uuid from 'uuid'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import { getReadOnlyConnection, getReadWriteConnection } from '../connection'
import { DeviceEntity } from '../entities/DeviceEntity'

const records = 10_000
const recorded = Date.now()

describe('Write/Read Devices', () => {
  it(records > 1 ? `Write ${records} Device(s)` : 'Write Device', async () => {
    const connection = await getReadWriteConnection()
    const devices = [...Array(records)].map((_, index) => ({
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
      await connection.manager.save(DeviceEntity, devices, { chunk: 5000 })
      test.value(devices.length).is(records)
    } finally {
      await connection.close()
    }
  })

  it(records > 1 ? `Read ${records} Device(s)` : 'Read Device', async () => {
    const connection = await getReadOnlyConnection()
    try {
      const devices = await connection.manager.find(DeviceEntity, { where: { recorded }, order: { id: 'ASC' } })
      test.value(devices.length).is(records)
    } finally {
      await connection.close()
    }
  })
})
