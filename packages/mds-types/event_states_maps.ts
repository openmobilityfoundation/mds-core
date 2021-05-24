import { MICRO_MOBILITY_VEHICLE_EVENT, TAXI_VEHICLE_EVENT, TNC_VEHICLE_EVENT } from './event'
import { MICRO_MOBILITY_VEHICLE_STATE, TAXI_VEHICLE_STATE, TNC_VEHICLE_STATE } from './vehicle/vehicle_states'

// States you transition into based on event_type
export const MICRO_MOBILITY_EVENT_STATES_MAP: {
  [P in MICRO_MOBILITY_VEHICLE_EVENT]: MICRO_MOBILITY_VEHICLE_STATE[]
} = {
  agency_drop_off: ['available'],
  agency_pick_up: ['removed'],
  battery_charged: ['available'],
  battery_low: ['non_operational'],
  comms_lost: ['unknown'],
  comms_restored: ['available', 'elsewhere', 'non_operational', 'removed', 'reserved', 'on_trip'],
  compliance_pick_up: ['removed'],
  decommissioned: ['removed'],
  located: ['available', 'non_operational', 'reserved', 'on_trip', 'elsewhere'],
  maintenance: ['available', 'non_operational'],
  maintenance_pick_up: ['removed'],
  missing: ['unknown'],
  off_hours: ['non_operational'],
  on_hours: ['available'],
  provider_drop_off: ['available'],
  rebalance_pick_up: ['removed'],
  reservation_cancel: ['available'],
  reservation_start: ['reserved'],
  system_resume: ['available'],
  system_suspend: ['non_operational'],
  trip_cancel: ['available'],
  trip_end: ['available'],
  trip_enter_jurisdiction: ['on_trip'],
  trip_leave_jurisdiction: ['elsewhere'],
  trip_start: ['on_trip'],
  unspecified: ['available', 'elsewhere', 'non_operational', 'on_trip', 'removed', 'reserved', 'unknown']
}

export const TAXI_EVENT_STATES_MAP: {
  [P in TAXI_VEHICLE_EVENT]: TAXI_VEHICLE_STATE[]
} = {
  comms_lost: ['unknown'],
  comms_restored: ['available', 'non_operational', 'reserved', 'on_trip', 'elsewhere'],
  decommissioned: ['removed'],
  maintenance_start: ['removed'],
  maintenance_end: ['non_operational'],
  driver_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  enter_jurisdiction: ['available', 'reserved', 'on_trip', 'non_operational'],
  leave_jurisdiction: ['elsewhere'],
  maintenance: ['available', 'non_operational'],
  passenger_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  provider_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  recommissioned: ['non_operational'],
  reservation_start: ['reserved'],
  reservation_stop: ['stopped'],
  service_end: ['non_operational'],
  service_start: ['available'],
  trip_end: ['available', 'on_trip', 'reserved', 'stopped'],
  trip_resume: ['on_trip'],
  trip_start: ['on_trip'],
  trip_stop: ['stopped']
}

export const TNC_EVENT_STATES_MAP: {
  [P in TNC_VEHICLE_EVENT]: TNC_VEHICLE_STATE[]
} = {
  comms_lost: ['unknown'],
  comms_restored: ['available', 'non_operational', 'reserved', 'on_trip', 'elsewhere'],
  driver_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  enter_jurisdiction: ['available', 'reserved', 'on_trip', 'non_operational'],
  leave_jurisdiction: ['elsewhere'],
  passenger_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  provider_cancellation: ['available', 'on_trip', 'reserved', 'stopped'],
  reservation_start: ['reserved'],
  reservation_stop: ['stopped'],
  service_end: ['non_operational'],
  service_start: ['available'],
  trip_end: ['available', 'on_trip', 'reserved', 'stopped'],
  trip_resume: ['on_trip'],
  trip_start: ['on_trip'],
  trip_stop: ['stopped'],
  unspecified: ['available', 'non_operational']
}
