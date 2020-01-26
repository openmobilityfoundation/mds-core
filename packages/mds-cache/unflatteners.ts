import {
  VEHICLE_TYPE,
  VEHICLE_EVENT,
  VEHICLE_STATUS,
  VEHICLE_REASON,
  Device,
  StateEntry,
  DeviceStates,
  TripEvent,
  TripsEvents,
  TripTelemetry,
  Telemetry,
  VehicleEvent
} from '@mds-core/mds-types'
import {
  isStringifiedTelemetry,
  isStringifiedEventWithTelemetry,
  isStringifiedCacheReadDeviceResult
} from '@mds-core/mds-schema-validators'

import { ParseError } from '@mds-core/mds-utils'
import {
  StringifiedEvent,
  StringifiedTelemetry,
  StringifiedCacheReadDeviceResult,
  CachedItem,
  StringifiedStateEntry,
  StringifiedAllDeviceStates,
  StringifiedTripEvent,
  StringifiedTripEvents,
  StringifiedTripTelemetry,
  StringifiedTripTelemetries,
  StringifiedAllTripsEvents
} from './types'

function parseDeviceState(deviceState: StringifiedStateEntry): StateEntry {
  try {
    return {
      vehicle_type: deviceState.vehicle_type as VEHICLE_TYPE,
      type: deviceState.type,
      timestamp: Number(deviceState.timestamp),
      device_id: deviceState.device_id,
      provider_id: deviceState.provider_id,
      recorded: Number(deviceState.recorded),
      annotation_version: Number(deviceState.annotation_version),
      annotation: deviceState.annotation
        ? { in_bound: JSON.parse(deviceState.annotation.in_bound), areas: deviceState.annotation.areas }
        : null,
      gps: deviceState.gps
        ? {
            lat: Number(deviceState.gps.lat),
            lng: Number(deviceState.gps.lng),
            altitude: deviceState.gps.altitude ? Number(deviceState.gps.altitude) : null,
            heading: deviceState.gps.heading ? Number(deviceState.gps.heading) : null,
            speed: deviceState.gps.speed ? Number(deviceState.gps.speed) : null,
            accuracy: deviceState.gps.accuracy ? Number(deviceState.gps.accuracy) : null
          }
        : null,
      service_area_id: deviceState.service_area_id ? deviceState.service_area_id : null,
      charge: deviceState.charge ? Number(deviceState.charge) : null,
      state: deviceState.state ? (deviceState.state as VEHICLE_STATUS) : null,
      event_type: deviceState.event_type ? (deviceState.event_type as VEHICLE_EVENT) : null,
      event_type_reason: deviceState.event_type_reason ? (deviceState.event_type_reason as VEHICLE_REASON) : null,
      trip_id: deviceState.trip_id ? deviceState.trip_id : null
    }
  } catch (err) {
    throw new ParseError(`unable to parse deviceState: ${deviceState}`)
  }
}

function parseAllDeviceStates(allDeviceStates: StringifiedAllDeviceStates): DeviceStates {
  try {
    const devices: DeviceStates = Object.keys(allDeviceStates).reduce((acc, vehicle_id) => {
      return Object.assign(acc, { [vehicle_id]: parseDeviceState(allDeviceStates[vehicle_id]) })
    }, {})
    return devices
  } catch (err) {
    throw new ParseError(`unable to parse allDeviceStates`)
  }
}

function parseTripEvents(tripEventsStr: StringifiedTripEvents): TripEvent[] {
  try {
    const tripEvents: StringifiedTripEvent[] = JSON.parse(tripEventsStr)
    const result: TripEvent[] = tripEvents.map(tripEvent => {
      return {
        vehicle_type: tripEvent.vehicle_type as VEHICLE_TYPE,
        timestamp: Number(tripEvent.timestamp),
        event_type: tripEvent.event_type as VEHICLE_EVENT,
        event_type_reason: tripEvent.event_type_reason ? (tripEvent.event_type_reason as VEHICLE_REASON) : null,
        annotation_version: Number(tripEvent.annotation_version),
        annotation: tripEvent.annotation
          ? {
              in_bound: JSON.parse(tripEvent.annotation.in_bound),
              areas: tripEvent.annotation.areas
            }
          : null,
        gps: tripEvent.gps
          ? {
              lat: Number(tripEvent.gps.lat),
              lng: Number(tripEvent.gps.lng),
              altitude: tripEvent.gps.altitude ? Number(tripEvent.gps.altitude) : null,
              heading: tripEvent.gps.heading ? Number(tripEvent.gps.heading) : null,
              speed: tripEvent.gps.speed ? Number(tripEvent.gps.speed) : null,
              accuracy: tripEvent.gps.accuracy ? Number(tripEvent.gps.accuracy) : null
            }
          : null,
        service_area_id: tripEvent.service_area_id ? tripEvent.service_area_id : null
      }
    })
    return result
  } catch (err) {
    throw new ParseError(`unable to parse tripsEvents: ${tripEventsStr}: ${err}`)
  }
}

function parseTripTelemetry(tripTelemetryStr: StringifiedTripTelemetries): TripTelemetry[] {
  try {
    const tripTelemetry: StringifiedTripTelemetry[] = JSON.parse(tripTelemetryStr)
    const result: TripTelemetry[] = tripTelemetry.map(telemetry => {
      return {
        timestamp: Number(telemetry.timestamp),
        latitude: telemetry.latitude ? Number(telemetry.latitude) : null,
        longitude: telemetry.longitude ? Number(telemetry.longitude) : null,
        annotation_version: Number(telemetry.annotation_version),
        annotation: telemetry.annotation
          ? {
              in_bound: JSON.parse(telemetry.annotation.in_bound),
              areas: telemetry.annotation.areas
            }
          : null,
        service_area_id: telemetry.service_area_id ? telemetry.service_area_id : null
      }
    })
    return result
  } catch (err) {
    throw new ParseError(`unable to parse tripsTelemetry: ${tripTelemetryStr}: ${err}`)
  }
}

function parseAllTripsEvents(allTripsEvents: StringifiedAllTripsEvents): TripsEvents {
  try {
    const allTrips: { [id: string]: TripEvent[] } = Object.keys(allTripsEvents).reduce((acc, vehicle_id) => {
      return Object.assign(acc, { [vehicle_id]: parseTripEvents(allTripsEvents[vehicle_id]) })
    }, {})
    return allTrips
  } catch (err) {
    throw new ParseError(`unable to parse allTripsEvents: ${err}`)
  }
}

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
      event_type: event.event_type as VEHICLE_EVENT,
      telemetry_timestamp: event.telemetry_timestamp ? Number(event.telemetry_timestamp) : null,
      telemetry: event.telemetry ? parseTelemetry(event.telemetry) : null,
      trip_id: event.trip_id ? event.trip_id : null,
      service_area_id: event.service_area_id ? event.service_area_id : null,
      recorded: Number(event.recorded)
    }
  }
  return event
}

function parseDevice(device: StringifiedCacheReadDeviceResult): Device {
  if (device) {
    return {
      device_id: device.device_id,
      provider_id: device.provider_id,
      vehicle_id: device.vehicle_id,
      type: device.type as VEHICLE_TYPE,
      propulsion: device.propulsion,
      year: device.year ? Number(device.year) : null,
      mfgr: device.mfgr ? device.mfgr : null,
      model: device.model ? device.model : null,
      recorded: Number(device.recorded),
      status: device.status ? (device.status as VEHICLE_STATUS) : null
    }
  }
  return device
}

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

export {
  parseDeviceState,
  parseAllDeviceStates,
  parseTripEvents,
  parseTripTelemetry,
  parseAllTripsEvents,
  parseEvent,
  parseTelemetry,
  parseDevice,
  parseCachedItem
}
