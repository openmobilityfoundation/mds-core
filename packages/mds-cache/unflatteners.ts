import { VEHICLE_TYPE, VEHICLE_EVENT, VEHICLE_STATUS, Device, Telemetry, VehicleEvent } from '@mds-core/mds-types'
import { StringifiedEvent, StringifiedTelemetry, StringifiedCacheReadDeviceResult } from './types'

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
    throw new Error(`unable to parse telemetry: ${telemetry}`)
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

export { parseEvent, parseTelemetry, parseDevice }
