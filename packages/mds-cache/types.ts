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
import {
  StateEntry,
  TripEvent,
  Device,
  VehicleEvent,
  TripTelemetry,
  Timestamp,
  Telemetry,
  Stringify,
  TelemetryData,
  GpsData,
  AnnotationData,
  PROPULSION_TYPE
} from '@mds-core/mds-types'

export type StringifiedStateEntry = Stringify<Omit<Omit<StateEntry, 'annotation'>, 'gps'>> & {
  annotation: Stringify<AnnotationData>
  gps: Stringify<GpsData>
}
export type StringifiedAllDeviceStates = { [vehicle_id: string]: StringifiedStateEntry }
export type StringifiedTripEvent = Stringify<Omit<Omit<TripEvent, 'annotation'>, 'gps'>> & {
  annotation: Stringify<AnnotationData> | null
  gps: Stringify<GpsData> | null
}
/* TODO: structure more specfic typedef for StringifiedTripEvents & StringifiedTripTelemetries */
export type StringifiedTripEvents = string
export type StringifiedAllTripsEvents = { [id: string]: StringifiedTripEvents }
export type StringifiedTripTelemetry = Stringify<Omit<TripTelemetry, 'annotation'>> & {
  annotation: Stringify<AnnotationData>
}
export type StringifiedEvent = Stringify<Omit<VehicleEvent, 'telemetry'>>
export type StringifiedTelemetry = Stringify<Omit<Telemetry, 'gps'>> & {
  gps: Stringify<Omit<TelemetryData, 'charge'>>
}
export type StringifiedTripTelemetries = string
export type StringifiedEventWithTelemetry = StringifiedEvent & { telemetry?: StringifiedTelemetry }

export type StringifiedCacheReadDeviceResult = Stringify<CacheReadDeviceResult & { timestamp?: Timestamp }> & {
  propulsion: PROPULSION_TYPE[]
}
export type CacheReadDeviceResult = Device & { updated?: Timestamp | null; telemetry?: Telemetry | null }
export type CachedItem =
  | StringifiedCacheReadDeviceResult
  | StringifiedTelemetry
  | StringifiedEvent
  | StringifiedStateEntry

export type CachedHashItem =
  | StringifiedAllTripsEvents
  | StringifiedAllDeviceStates
  | StringifiedTripEvents
  | StringifiedTripTelemetries
