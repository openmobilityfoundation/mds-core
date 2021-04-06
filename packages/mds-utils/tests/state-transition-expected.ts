/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { VEHICLE_EVENT } from '@mds-core/mds-types'

export const expectedTransitions: {
  [A in VEHICLE_EVENT]: {
    [B in VEHICLE_EVENT]: boolean
  }
} = {
  register: {
    register: false,
    service_start: false,
    service_end: false,
    provider_drop_off: true,
    provider_pick_up: false,
    agency_pick_up: false,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: false,
    trip_enter: true,
    trip_leave: false,
    trip_end: false,
    deregister: true
  },
  service_start: {
    register: false,
    service_start: false,
    service_end: true,
    provider_drop_off: false,
    provider_pick_up: false,
    agency_pick_up: true,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: true,
    trip_enter: false,
    trip_leave: false,
    trip_end: false,
    deregister: true
  },
  service_end: {
    register: false,
    service_start: true,
    service_end: false,
    provider_drop_off: false,
    provider_pick_up: true,
    agency_pick_up: true,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: false,
    trip_enter: false,
    trip_leave: false,
    trip_end: false,
    deregister: true
  },
  provider_drop_off: {
    register: false,
    service_start: false,
    service_end: true,
    provider_drop_off: false,
    provider_pick_up: false,
    agency_pick_up: true,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: true,
    trip_enter: false,
    trip_leave: false,
    trip_end: false,
    deregister: true
  },
  provider_pick_up: {
    register: false,
    service_start: false,
    service_end: false,
    provider_drop_off: true,
    provider_pick_up: false,
    agency_pick_up: false,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: false,
    trip_enter: true,
    trip_leave: false,
    trip_end: false,
    deregister: true
  },
  agency_pick_up: {
    register: false,
    service_start: false,
    service_end: false,
    provider_drop_off: true,
    provider_pick_up: false,
    agency_pick_up: false,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: false,
    trip_enter: true,
    trip_leave: false,
    trip_end: false,
    deregister: true
  },
  agency_drop_off: {
    register: false,
    service_start: false,
    service_end: true,
    provider_drop_off: false,
    provider_pick_up: false,
    agency_pick_up: true,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: true,
    trip_enter: false,
    trip_leave: false,
    trip_end: false,
    deregister: true
  },
  reserve: {
    register: false,
    service_start: false,
    service_end: false,
    provider_drop_off: false,
    provider_pick_up: false,
    agency_pick_up: false,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: true,
    trip_start: true,
    trip_enter: false,
    trip_leave: false,
    trip_end: false,
    deregister: false
  },
  cancel_reservation: {
    register: false,
    service_start: false,
    service_end: true,
    provider_drop_off: false,
    provider_pick_up: false,
    agency_pick_up: true,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: true,
    trip_enter: false,
    trip_leave: false,
    trip_end: false,
    deregister: true
  },
  trip_start: {
    register: false,
    service_start: false,
    service_end: false,
    provider_drop_off: false,
    provider_pick_up: false,
    agency_pick_up: false,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: false,
    trip_enter: false,
    trip_leave: true,
    trip_end: true,
    deregister: false
  },
  trip_enter: {
    register: false,
    service_start: false,
    service_end: false,
    provider_drop_off: false,
    provider_pick_up: false,
    agency_pick_up: false,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: false,
    trip_enter: false,
    trip_leave: true,
    trip_end: true,
    deregister: false
  },
  trip_leave: {
    register: false,
    service_start: false,
    service_end: false,
    provider_drop_off: true,
    provider_pick_up: true,
    agency_pick_up: false,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: false,
    trip_enter: true,
    trip_leave: false,
    trip_end: false,
    deregister: true
  },
  trip_end: {
    register: false,
    service_start: false,
    service_end: true,
    provider_drop_off: false,
    provider_pick_up: false,
    agency_pick_up: true,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: true,
    trip_enter: false,
    trip_leave: false,
    trip_end: false,
    deregister: true
  },
  deregister: {
    register: true,
    service_start: false,
    service_end: false,
    provider_drop_off: false,
    provider_pick_up: false,
    agency_pick_up: false,
    agency_drop_off: false,
    reserve: false,
    cancel_reservation: false,
    trip_start: false,
    trip_enter: false,
    trip_leave: false,
    trip_end: false,
    deregister: false
  }
}
