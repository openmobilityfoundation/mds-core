import { ACCESSIBILITY_OPTION } from './device'
import { GpsData } from './telemetry'
import { Timestamp, UUID } from './utils'

export const TRIP_STATES = ['on_trip', 'reserved', 'stopped'] as const
export type TRIP_STATE = typeof TRIP_STATES[number]

export const PAYMENT_METHODS = ['cash', 'card', 'equity_program'] as const
export type PAYMENT_METHOD = typeof PAYMENT_METHODS[number]

export const RESERVATION_METHODS = ['app', 'street_hail', 'phone_dispatch'] as const
export type RESERVATION_METHOD = typeof RESERVATION_METHODS[number]

export const RESERVATION_TYPES = ['on_demand', 'scheduled'] as const
export type RESERVATION_TYPE = typeof RESERVATION_TYPES[number]

export interface CountMap {
  [P: string]: number
}

export interface TripsStats {
  single: number
  singles: CountMap
  mysteries: CountMap
  mystery_examples: { [key: string]: UUID[] }
}

export type TripMetadata<T = {}> = {
  trip_id: UUID
  provider_id: UUID
  reservation_time?: Timestamp
  reservation_method?: RESERVATION_METHOD
  reservation_type?: RESERVATION_TYPE
  quoted_trip_start_time?: Timestamp
  requested_trip_start_location?: Pick<GpsData, 'lat' | 'lng'>
  cancellation_reason?: string
  dispatch_time?: Timestamp
  trip_start_time?: Timestamp
  trip_end_time?: Timestamp
  distance?: number // Distance in meters
  accessibility_options?: ACCESSIBILITY_OPTION[]
  fare?: {
    quoted_cost?: number
    actual_cost?: number
    components?: { [entity: string]: number } // e.g. entity = 'LAX_AIRPORT_FEE'
    currency?: string
    payment_methods?: PAYMENT_METHOD[]
  }
} & T
