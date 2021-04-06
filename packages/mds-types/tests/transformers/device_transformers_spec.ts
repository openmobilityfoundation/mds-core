import assert from 'assert'
import { Device_v0_4_1 } from '../../transformers/@types'
import { Device_v1_0_0 } from '../../index'
import { convert_v0_4_1_device_to_1_0_0, convert_v1_0_0_device_to_0_4_1 } from '../../transformers'

const TIME = Date.now()
const DEVICE_ID = 'd0d9c274-773f-46c4-8c3a-f3cd35e4f99c'
const PROVIDER_ID = 'baf215d4-8b4b-4be4-8189-980171a964ba'
const VEHICLE_ID = '3f411cb1-a5a4-4b29-9e72-2714fdd24bc8'

describe('Test transformers', () => {
  it('checks the transformation between v0.4.1 and v1.0.0 Device types', done => {
    const device: Device_v0_4_1 = {
      device_id: DEVICE_ID,
      provider_id: PROVIDER_ID,
      vehicle_id: VEHICLE_ID,
      type: 'scooter',
      propulsion: ['electric'],
      status: 'removed',
      year: 2000,
      mfgr: 'Cadillac',
      model: 'luxury',
      recorded: TIME
    }

    assert.deepEqual(convert_v0_4_1_device_to_1_0_0(device), {
      device_id: DEVICE_ID,
      provider_id: PROVIDER_ID,
      vehicle_id: VEHICLE_ID,
      vehicle_type: 'scooter',
      propulsion_types: ['electric'],
      state: 'removed',
      recorded: TIME,
      year: 2000,
      mfgr: 'Cadillac',
      model: 'luxury'
    })

    done()
  })

  it('checks the transformations from v1.0.0 Device to v0.4.0', done => {
    const device: Device_v1_0_0 = {
      device_id: DEVICE_ID,
      provider_id: PROVIDER_ID,
      vehicle_id: VEHICLE_ID,
      vehicle_type: 'scooter',
      propulsion_types: ['electric', 'hybrid'],
      state: 'removed',
      recorded: TIME,
      year: 2000,
      mfgr: 'Schwinn',
      model: 'fancy'
    }

    assert.deepEqual(convert_v1_0_0_device_to_0_4_1(device), {
      device_id: DEVICE_ID,
      provider_id: PROVIDER_ID,
      vehicle_id: VEHICLE_ID,
      type: 'scooter',
      propulsion: ['electric', 'hybrid'],
      status: 'removed',
      recorded: TIME,
      year: 2000,
      mfgr: 'Schwinn',
      model: 'fancy'
    })
    done()
  })
})
