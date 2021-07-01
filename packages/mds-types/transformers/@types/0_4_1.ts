/* This file contains the v0.4.1 versions of the VehicleEvent type and all related
 * types. The main differences between v0.4.1 and v1.0.0 are:
 *    1. Originally, a VehicleEvent could have only one `event_type`. Now, providers are
 *  allowed to send multiple event_types in an array.
 *    2. The field `event_type_reason` is deprecated in v1.0.0.
 *    3. The number of valid event_types has been expanded, and many of them correspond to
 *  former `event_type_reasons`.
 */

import { PROPULSION_TYPE, Telemetry, Timestamp, UUID, VEHICLE_TYPE } from '../../index'

export const VEHICLE_REASONS_v0_4_1 = [
  'battery_charged',
  'charge',
  'compliance',
  'decommissioned',
  'low_battery',
  'maintenance',
  'missing',
  'off_hours',
  'rebalance'
]
export type VEHICLE_REASON_v0_4_1 = typeof VEHICLE_REASONS_v0_4_1[number]

export const VEHICLE_EVENTS_v0_4_1 = [
  'register',
  'service_start',
  'service_end',
  'provider_drop_off',
  'provider_pick_up',
  'agency_pick_up',
  'agency_drop_off',
  'reserve',
  'cancel_reservation',
  'trip_start',
  'trip_enter',
  'trip_leave',
  'trip_end',
  'deregister'
] as const

export type VEHICLE_EVENT_v0_4_1 = typeof VEHICLE_EVENTS_v0_4_1[number]

export interface VehicleEvent_v0_4_1 {
  device_id: UUID
  provider_id: UUID
  timestamp: Timestamp
  timestamp_long?: string | null
  delta?: Timestamp | null
  event_type: VEHICLE_EVENT_v0_4_1 | TRANSFORMER_VEHICLE_EVENT
  event_type_reason?: VEHICLE_REASON_v0_4_1 | null | TRANSFORMER_EVENT_TYPE_REASON
  telemetry_timestamp?: Timestamp | null
  telemetry?: Telemetry | null
  trip_id?: UUID | null
  service_area_id?: UUID | null
  recorded: Timestamp
}

export const VEHICLE_STATES_v0_4_1 = [
  'available',
  'elsewhere',
  'inactive',
  'trip',
  'removed',
  'reserved',
  'unavailable'
] as const
export type VEHICLE_STATE_v0_4_1 = typeof VEHICLE_STATES_v0_4_1[number]

// Old event-states transitions.
export const EVENT_STATES_MAP_v0_4_1: { [P in VEHICLE_EVENT_v0_4_1]: VEHICLE_STATE_v0_4_1 } = {
  register: 'removed',
  service_start: 'available',
  service_end: 'unavailable',
  provider_drop_off: 'available',
  provider_pick_up: 'removed',
  agency_pick_up: 'removed',
  agency_drop_off: 'available',
  reserve: 'reserved',
  cancel_reservation: 'available',
  trip_start: 'trip',
  trip_enter: 'trip',
  trip_leave: 'elsewhere',
  trip_end: 'available',
  deregister: 'inactive'
}

export type TRANSFORMER_VEHICLE_EVENT = 'no_backconversion_available'
export type TRANSFORMER_EVENT_TYPE_REASON = 'no_event_type_reason'

export interface Device_v0_4_1 {
  device_id: UUID
  provider_id: UUID
  vehicle_id: string
  type: VEHICLE_TYPE
  propulsion: PROPULSION_TYPE[]
  year?: number | null
  mfgr?: string | null
  model?: string | null
  recorded: Timestamp
  status?: VEHICLE_STATE_v0_4_1 | null
}
