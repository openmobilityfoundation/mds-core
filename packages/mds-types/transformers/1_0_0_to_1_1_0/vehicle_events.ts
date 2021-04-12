import { VehicleEvent_v1_1_0 } from '../../index'
import { VehicleEvent_v1_0_0 } from '../@types'

export const convert_v1_0_0_vehicle_event_to_v1_1_0 = (event: VehicleEvent_v1_0_0): VehicleEvent_v1_1_0 => ({
  ...event,
  trip_state: null
})
