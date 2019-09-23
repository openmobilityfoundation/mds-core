import {
  isUUID,
  isPct,
  isTimestamp,
  isFloat,
  pointInShape,
  now,
  pathsFor,
  ServerError,
  isInsideBoundingBox
} from '@mds-core/mds-utils'
import {
  UUID,
  Recorded,
  Device,
  VehicleEvent,
  Telemetry,
  ErrorObject,
  Timestamp,
  DeviceID,
  isEnum,
  VEHICLE_EVENTS,
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
  VEHICLE_REASONS,
  PROPULSION_TYPES,
  EVENT_STATUS_MAP,
  VEHICLE_STATUS,
  VEHICLE_EVENT,
  BoundingBox,
  VEHICLE_REASON
} from '@mds-core/mds-types'

export function badDevice(device: Device): Partial<{ error: string; error_description: string }> | boolean {
    if (!device.device_id) {
      return {
        error: 'missing_param',
        error_description: 'missing device_id'
      }
    }
    if (!isUUID(device.device_id)) {
      return {
        error: 'bad_param',
        error_description: `device_id ${device.device_id} is not a UUID`
      }
    }
    // propulsion is a list
    if (!Array.isArray(device.propulsion)) {
      return {
        error: 'missing_param',
        error_description: 'missing propulsion types'
      }
    }
    for (const prop of device.propulsion) {
      if (!isEnum(PROPULSION_TYPES, prop)) {
        return {
          error: 'bad_param',
          error_description: `invalid propulsion type ${prop}`
        }
      }
    }
    // if (device.year === undefined) {
    //     return {
    //         error: 'missing_param',
    //         error_description: 'missing integer field "year"'
    //     }
    // }
    if (device.year !== null && device.year !== undefined) {
      if (!Number.isInteger(device.year)) {
        return {
          error: 'bad_param',
          error_description: `invalid device year ${device.year} is not an integer`
        }
      }
      if (device.year < 1980 || device.year > 2020) {
        return {
          error: 'bad_param',
          error_description: `invalid device year ${device.year} is out of range`
        }
      }
    }
    if (device.type === undefined) {
      return {
        error: 'missing_param',
        error_description: 'missing enum field "type"'
      }
    }
    if (!isEnum(VEHICLE_TYPES, device.type)) {
      return {
        error: 'bad_param',
        error_description: `invalid device type ${device.type}`
      }
    }
    // if (device.mfgr === undefined) {
    //     return {
    //         error: 'missing_param',
    //         error_description: 'missing string field "mfgr"'
    //     }
    // }
    // if (device.model === undefined) {
    //     return {
    //         error: 'missing_param',
    //         error_description: 'missing string field "model"'
    //     }
    // }
    return false
  }