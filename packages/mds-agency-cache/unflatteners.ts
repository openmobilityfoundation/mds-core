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

import {
  VEHICLE_TYPE,
  VEHICLE_EVENT,
  VEHICLE_STATE,
  PROPULSION_TYPE,
  Device,
  Telemetry,
  VehicleEvent,
  ACCESSIBILITY_OPTION,
  MODALITY,
  TRIP_STATE
} from '@mds-core/mds-types'

import { ParseError } from '@mds-core/mds-utils'
import { HasPropertyAssertion } from '@mds-core/mds-schema-validators'
import {
  StringifiedEvent,
  StringifiedEventWithTelemetry,
  StringifiedTelemetry,
  StringifiedCacheReadDeviceResult,
  CachedItem
} from './types'

function parseTelemetry(telemetry: StringifiedTelemetry): Telemetry {
  try {
    return {
      charge: telemetry.charge ? Number(telemetry.charge) : null,
      device_id: telemetry.device_id,
      provider_id: telemetry.provider_id,
      gps: {
        lat: Number(telemetry.gps.lat),
        lng: Number(telemetry.gps.lng),
        speed: telemetry.gps.speed ? Number(telemetry.gps.speed) : null,
        satellites: telemetry.gps.satellites ? Number(telemetry.gps.satellites) : null,
        heading: telemetry.gps.heading ? Number(telemetry.gps.heading) : null,
        hdop: telemetry.gps.hdop ? Number(telemetry.gps.hdop) : null,
        altitude: telemetry.gps.altitude ? Number(telemetry.gps.altitude) : null
      },
      recorded: Number(telemetry.recorded),
      timestamp: Number(telemetry.timestamp)
    }
  } catch (err) {
    throw new ParseError(`unable to parse telemetry: ${telemetry}`)
  }
}

function parseEvent(
  event: StringifiedEvent & {
    telemetry?: StringifiedTelemetry
  }
): VehicleEvent {
  if (event) {
    return {
      device_id: event.device_id,
      provider_id: event.provider_id,
      timestamp: Number(event.timestamp),
      timestamp_long: event.timestamp_long ? event.timestamp_long : null,
      delta: event.delta ? Number(event.delta) : null,
      event_types: event.event_types as VEHICLE_EVENT[],
      telemetry_timestamp: event.telemetry_timestamp ? Number(event.telemetry_timestamp) : null,
      telemetry: event.telemetry ? parseTelemetry(event.telemetry) : null,
      trip_id: event.trip_id ? event.trip_id : null,
      recorded: Number(event.recorded),
      vehicle_state: event.vehicle_state as VEHICLE_STATE,
      trip_state: event.trip_state ? (event.trip_state as TRIP_STATE) : null
    }
  }
  return event
}

function parseDevice(device: StringifiedCacheReadDeviceResult): Device {
  if (device) {
    return {
      accessibility_options: device.accessibility_options
        ? (device.accessibility_options as ACCESSIBILITY_OPTION[])
        : [],
      device_id: device.device_id,
      provider_id: device.provider_id,
      vehicle_id: device.vehicle_id,
      vehicle_type: device.vehicle_type as VEHICLE_TYPE,
      propulsion_types: device.propulsion_types as PROPULSION_TYPE[],
      year: device.year ? Number(device.year) : null,
      mfgr: device.mfgr ? device.mfgr : null,
      modality: device.modality as MODALITY,
      model: device.model ? device.model : null,
      recorded: Number(device.recorded),
      state: device.state ? (device.state as VEHICLE_STATE) : null
    }
  }
  return device
}

const isStringifiedTelemetry = (telemetry: unknown): telemetry is StringifiedTelemetry =>
  HasPropertyAssertion<StringifiedTelemetry>(telemetry, 'gps')

const isStringifiedEventWithTelemetry = (event: unknown): event is StringifiedEventWithTelemetry =>
  HasPropertyAssertion<StringifiedEventWithTelemetry>(event, 'event_types', 'telemetry')

const isStringifiedCacheReadDeviceResult = (device: unknown): device is StringifiedCacheReadDeviceResult =>
  HasPropertyAssertion<StringifiedCacheReadDeviceResult>(
    device,
    'device_id',
    'provider_id',
    'vehicle_type',
    'propulsion_types'
  )

function parseCachedItem(item: CachedItem): Device | Telemetry | VehicleEvent {
  if (isStringifiedTelemetry(item)) {
    return parseTelemetry(item)
  }
  if (isStringifiedEventWithTelemetry(item)) {
    return parseEvent(item)
  }
  if (isStringifiedCacheReadDeviceResult(item)) {
    return parseDevice(item)
  }

  throw new ParseError(`unable to parse ${JSON.stringify(item)}`)
}

export { parseEvent, parseTelemetry, parseDevice, parseCachedItem }
