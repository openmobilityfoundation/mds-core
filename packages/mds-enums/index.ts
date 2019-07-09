/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

// /////////// enums ////////////////

export const Enum = <T extends string>(...keys: T[]) =>
  Object.freeze(keys.reduce((e, key) => {
    return { ...e, [key]: key }
  }, {}) as { [K in T]: K })

export const isEnum = (enums: { [key: string]: string }, value: unknown) =>
  typeof value === 'string' && typeof enums === 'object' && enums[value] === value

export const VEHICLE_TYPES = Enum('car', 'bicycle', 'scooter', 'recumbent')
export type VEHICLE_TYPE = keyof typeof VEHICLE_TYPES

export const RULE_TYPES = Enum('count', 'speed', 'time')
export type RULE_TYPE = keyof typeof RULE_TYPES

export const RULE_UNIT_MAP = {
  minutes: 60,
  hours: 60 * 60
}

export const PROPULSION_TYPES = Enum('human', 'electric', 'electric_assist', 'hybrid', 'combustion')
export type PROPULSION_TYPE = keyof typeof PROPULSION_TYPES

export const VEHICLE_STATUSES = Enum('available', 'reserved', 'unavailable', 'removed', 'inactive', 'trip', 'elsewhere')
export type VEHICLE_STATUS = keyof typeof VEHICLE_STATUSES

export const VEHICLE_EVENTS = Enum(
  'register',
  'service_start',
  'service_end',
  'trip_start',
  'trip_end',
  'trip_enter',
  'trip_leave',
  'reserve',
  'cancel_reservation',
  'user_drop_off',
  'default',
  'provider_pick_up',
  'provider_drop_off',
  'agency_pick_up',
  'agency_drop_off',
  'deregister'
)
export type VEHICLE_EVENT = keyof typeof VEHICLE_EVENTS

export const VEHICLE_REASONS = Enum(
  'user_drop_off',
  'rebalance',
  'maintenance',
  'charge',
  'low_battery', // deprecated
  'battery_charged', // deprecated
  'compliance',
  'off_hours',
  'missing',
  'decommissioned',
  'default'
)
export type VEHICLE_REASON = keyof typeof VEHICLE_REASONS

export const AUDIT_EVENT_TYPES = Enum('start', 'note', 'summary', 'issue', 'telemetry', 'end')
export type AUDIT_EVENT_TYPE = keyof typeof AUDIT_EVENT_TYPES

const AVAILABLE_EVENTS = Enum(
  VEHICLE_EVENTS.service_start,
  VEHICLE_EVENTS.provider_drop_off,
  VEHICLE_EVENTS.trip_end,
  VEHICLE_EVENTS.cancel_reservation
)

const RESERVED_EVENTS = Enum(VEHICLE_EVENTS.reserve)

const UNAVAILABLE_EVENTS = Enum(VEHICLE_EVENTS.service_end)

const TRIP_EVENTS = Enum(VEHICLE_EVENTS.trip_start, VEHICLE_EVENTS.trip_enter)

const ELSEWHERE_EVENTS = Enum(VEHICLE_EVENTS.trip_leave)

const REMOVED_EVENTS = Enum(
  VEHICLE_EVENTS.register,
  VEHICLE_EVENTS.provider_pick_up,
  VEHICLE_EVENTS.agency_drop_off,
  VEHICLE_EVENTS.default
)

const INACTIVE_EVENTS = Enum(VEHICLE_EVENTS.agency_pick_up, VEHICLE_EVENTS.deregister)

export const EVENT_STATUS_MAP = {
  service_start: VEHICLE_STATUSES.available,
  user_drop_off: VEHICLE_STATUSES.available,
  provider_drop_off: VEHICLE_STATUSES.available,
  trip_end: VEHICLE_STATUSES.available,
  cancel_reservation: VEHICLE_STATUSES.available,

  reserve: VEHICLE_STATUSES.reserved,

  service_end: VEHICLE_STATUSES.unavailable,

  trip_start: VEHICLE_STATUSES.trip,
  trip_enter: VEHICLE_STATUSES.trip,

  trip_leave: VEHICLE_STATUSES.elsewhere,

  register: VEHICLE_STATUSES.removed,
  provider_pick_up: VEHICLE_STATUSES.removed,
  agency_drop_off: VEHICLE_STATUSES.removed,
  default: VEHICLE_STATUSES.removed,

  deregister: VEHICLE_STATUSES.inactive,
  agency_pick_up: VEHICLE_STATUSES.inactive
}

export const STATUS_EVENT_MAP = {
  available: AVAILABLE_EVENTS,
  reserved: RESERVED_EVENTS,
  unavailable: UNAVAILABLE_EVENTS,
  trip: TRIP_EVENTS,
  elsewhere: ELSEWHERE_EVENTS,
  removed: REMOVED_EVENTS,
  inactive: INACTIVE_EVENTS
}

export const DAYS_OF_WEEK = Enum('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat')
export type DAY_OF_WEEK = keyof typeof DAYS_OF_WEEK
export const TIME_FORMAT = 'HH:mm:ss'
