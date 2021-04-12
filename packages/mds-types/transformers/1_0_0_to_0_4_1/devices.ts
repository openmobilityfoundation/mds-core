import { VEHICLE_STATE_v1_0_0, Device_v1_0_0, Device_v0_4_1, VEHICLE_STATE_v0_4_1 } from '../@types'

const STATE_TO_STATUS_MAPPING: { [P in VEHICLE_STATE_v1_0_0]: VEHICLE_STATE_v0_4_1 } = {
  available: 'available',
  elsewhere: 'elsewhere',
  non_operational: 'unavailable',
  on_trip: 'trip',
  removed: 'removed',
  reserved: 'reserved',
  unknown: 'unavailable'
}

export function convert_v1_0_0_device_to_0_4_1(device: Device_v1_0_0): Device_v0_4_1 {
  const {
    provider_id,
    device_id,
    vehicle_id,
    vehicle_type,
    propulsion_types,
    year,
    mfgr,
    model,
    recorded,
    state
  } = device
  return {
    provider_id,
    device_id,
    vehicle_id,
    type: vehicle_type,
    propulsion: propulsion_types,
    year,
    mfgr,
    model,
    recorded,
    status: state ? STATE_TO_STATUS_MAPPING[state] : state
  }
}
