import { PROPULSION_TYPE, Telemetry, Timestamp, UUID, VEHICLE_TYPE } from '../../index'

export const VEHICLE_STATES_v1_0_0 = [
  'available',
  'elsewhere',
  'non_operational',
  'on_trip',
  'removed',
  'reserved',
  'unknown'
] as const
export type VEHICLE_STATE_v1_0_0 = typeof VEHICLE_STATES_v1_0_0[number]

export const VEHICLE_EVENTS_v1_0_0 = [
  'agency_drop_off',
  'agency_pick_up',
  'battery_charged',
  'battery_low',
  'comms_lost',
  'comms_restored',
  'compliance_pick_up',
  'decommissioned',
  'located',
  'maintenance',
  'maintenance_pick_up',
  'missing',
  'off_hours',
  'on_hours',
  'provider_drop_off',
  'rebalance_pick_up',
  'reservation_cancel',
  'reservation_start',
  'system_resume',
  'system_suspend',
  'trip_cancel',
  'trip_end',
  'trip_enter_jurisdiction',
  'trip_leave_jurisdiction',
  'trip_start',
  'unspecified'
] as const
export type VEHICLE_EVENT_v1_0_0 = typeof VEHICLE_EVENTS_v1_0_0[number]

export interface VehicleEvent_v1_0_0 {
  device_id: UUID
  provider_id: UUID
  timestamp: Timestamp
  timestamp_long?: string | null
  delta?: Timestamp | null
  event_types: VEHICLE_EVENT_v1_0_0[]
  telemetry_timestamp?: Timestamp | null
  telemetry?: Telemetry | null
  trip_id?: UUID | null
  vehicle_state: VEHICLE_STATE_v1_0_0
  recorded: Timestamp
}

export interface Device_v1_0_0 {
  device_id: UUID
  provider_id: UUID
  vehicle_id: string
  vehicle_type: VEHICLE_TYPE // changed name in 1.0
  propulsion_types: PROPULSION_TYPE[] // changed name in 1.0
  year?: number | null
  mfgr?: string | null
  model?: string | null
  recorded: Timestamp
  state?: VEHICLE_STATE_v1_0_0 | null
}
