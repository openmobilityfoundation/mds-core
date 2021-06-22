export const MICRO_MOBILITY_VEHICLE_STATES_v1_1_0 = [
  'available',
  'elsewhere',
  'non_operational',
  'on_trip',
  'removed',
  'reserved',
  'unknown'
] as const
export type MICRO_MOBILITY_VEHICLE_STATE_v1_1_0 = typeof MICRO_MOBILITY_VEHICLE_STATES_v1_1_0[number]

export const MICRO_MOBILITY_VEHICLE_STATES = MICRO_MOBILITY_VEHICLE_STATES_v1_1_0
export type MICRO_MOBILITY_VEHICLE_STATE = MICRO_MOBILITY_VEHICLE_STATE_v1_1_0

export const TAXI_VEHICLE_STATES = [
  'available',
  'elsewhere',
  'non_operational',
  'on_trip',
  'removed',
  'reserved',
  'stopped',
  'unknown'
] as const
export type TAXI_VEHICLE_STATE = typeof TAXI_VEHICLE_STATES[number]

export const TNC_VEHICLE_STATE = <const>[
  'available',
  'elsewhere',
  'non_operational',
  'on_trip',
  'reserved',
  'stopped',
  'unknown'
]
export type TNC_VEHICLE_STATE = typeof TNC_VEHICLE_STATE[number]

export const VEHICLE_STATES_v1_1_0 = [
  ...new Set([...MICRO_MOBILITY_VEHICLE_STATES_v1_1_0, ...TAXI_VEHICLE_STATES, ...TNC_VEHICLE_STATE])
] as const
export type VEHICLE_STATE_v1_1_0 = typeof VEHICLE_STATES_v1_1_0[number]

export const VEHICLE_STATES = VEHICLE_STATES_v1_1_0
export type VEHICLE_STATE = VEHICLE_STATE_v1_1_0
