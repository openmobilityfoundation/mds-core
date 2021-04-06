import { Device_v0_4_1, VEHICLE_STATE_v0_4_1 } from '../@types'
import { Device_v1_0_0, VEHICLE_STATE_v1_0_0 } from '../../index'

const STATE_TO_STATUS_MAPPING: { [P in VEHICLE_STATE_v0_4_1]: VEHICLE_STATE_v1_0_0 } = {
  available: 'available',
  elsewhere: 'elsewhere',
  inactive: 'removed',
  trip: 'on_trip',
  removed: 'removed',
  reserved: 'reserved',
  unavailable: 'removed'
}

export function convert_v0_4_1_device_to_1_0_0(device: Device_v0_4_1): Device_v1_0_0 {
  const { provider_id, device_id, vehicle_id, type, propulsion, year, mfgr, model, recorded, status } = device
  return {
    provider_id,
    device_id,
    vehicle_id,
    vehicle_type: type,
    propulsion_types: propulsion,
    year,
    mfgr,
    model,
    recorded,
    state: status ? STATE_TO_STATUS_MAPPING[status] : status
  }
}
