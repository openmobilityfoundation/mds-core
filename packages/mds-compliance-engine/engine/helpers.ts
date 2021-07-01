import cache from '@mds-core/mds-agency-cache'
import { MatchedVehicleInformation } from '@mds-core/mds-compliance-service'
import db from '@mds-core/mds-db'
import { providers } from '@mds-core/mds-providers'
import {
  DAYS_OF_WEEK,
  DAY_OF_WEEK,
  Device,
  Geography,
  ModalityPolicy,
  ModalityRule,
  RULE_TYPE,
  TIME_FORMAT,
  UUID,
  VehicleEvent
} from '@mds-core/mds-types'
import { isDefined, now, RuntimeError } from '@mds-core/mds-utils'
import moment from 'moment-timezone'
import { VehicleEventWithTelemetry } from '../@types'

const { env } = process

const TWO_DAYS_IN_MS = 172800000

export function getPolicyType(policy: ModalityPolicy) {
  return policy.rules[0].rule_type
}

export function generateDeviceMap(devices: Device[]): { [d: string]: Device } {
  return [...devices].reduce((deviceMapAcc: { [d: string]: Device }, device: Device) => {
    return Object.assign(deviceMapAcc, { [device.device_id]: device })
  }, {})
}

export function isPolicyUniversal(policy: ModalityPolicy) {
  return !policy.provider_ids || policy.provider_ids.length === 0
}

export async function getComplianceInputs(provider_id: string | undefined) {
  const deviceRecords = await db.readDeviceIds(provider_id)
  const deviceIdSubset = deviceRecords.map((record: { device_id: UUID; provider_id: UUID }) => record.device_id)
  const devices = await cache.readDevices(deviceIdSubset)
  // Get last event for each of these devices.
  const events = await cache.readEvents(deviceIdSubset)

  const deviceMap = devices.reduce((map: { [d: string]: Device }, device) => {
    return device ? Object.assign(map, { [device.device_id]: device }) : map
  }, {})

  /*  We do not evaluate violations for vehicles that have not sent events within the last 48 hours.
   * So we throw old events out and do not consider them.
   * We also don't consider events that have no associated telemetry.
   */
  const filteredEvents = filterEvents(events)
  return { filteredEvents, deviceMap }
}

export function isPolicyActive(policy: ModalityPolicy, end_time: number = now()): boolean {
  if (policy.end_date === null) {
    return end_time >= policy.start_date
  }
  return end_time >= policy.start_date && end_time <= policy.end_date
}

export function isRuleActive(rule: ModalityRule<Exclude<RULE_TYPE, 'rate'>>): boolean {
  if (!env.TIMEZONE) {
    throw new RuntimeError('TIMEZONE environment variable must be declared!')
  }

  if (!moment.tz.names().includes(env.TIMEZONE)) {
    throw new RuntimeError(`TIMEZONE environment variable ${env.TIMEZONE} is not a valid timezone!`)
  }

  const local_time = moment().tz(env.TIMEZONE)

  if (!rule.days || rule.days.includes(Object.values(DAYS_OF_WEEK)[local_time.day()] as DAY_OF_WEEK)) {
    if (!rule.start_time || local_time.isAfter(moment(rule.start_time, TIME_FORMAT))) {
      if (!rule.end_time || local_time.isBefore(moment(rule.end_time, TIME_FORMAT))) {
        return true
      }
    }
  }
  return false
}

export function isInVehicleTypes(rule: ModalityRule<Exclude<RULE_TYPE, 'rate'>>, device: Device): boolean {
  return !rule.vehicle_types || (rule.vehicle_types && rule.vehicle_types.includes(device.vehicle_type))
}

// Take a list of policies, and eliminate all those that have been superseded. Returns
// policies that have not been superseded.
export function getSupersedingPolicies(policies: ModalityPolicy[]): ModalityPolicy[] {
  const prev_policies: string[] = policies.reduce((prev_policies_acc: string[], policy: ModalityPolicy) => {
    if (policy.prev_policies) {
      prev_policies_acc.push(...policy.prev_policies)
    }
    return prev_policies_acc
  }, [])
  return policies.filter((policy: ModalityPolicy) => {
    return !prev_policies.includes(policy.policy_id)
  })
}

/**  Keep events that are less than two days old.
 * @param events Events with no telemetry are not used to process compliance and will be filtered out.
 * @param end_time This is a somewhat arbitrary window of time.
 */
export function filterEvents(events: VehicleEvent[], end_time = now()): VehicleEvent[] {
  return events
    .filter((event: VehicleEvent) => {
      return event.telemetry && event.timestamp > end_time - TWO_DAYS_IN_MS
    })
    .sort((e_1, e_2) => {
      return e_1.timestamp - e_2.timestamp
    })
}

export function createMatchedVehicleInformation(
  device: Device,
  event: VehicleEventWithTelemetry,
  speed?: number,
  rule_applied_id?: UUID,
  rules_matched?: UUID[]
): MatchedVehicleInformation {
  return {
    device_id: device.device_id,
    state: event.vehicle_state,
    event_types: event.event_types,
    timestamp: event.timestamp,
    rules_matched: rules_matched || [],
    rule_applied: rule_applied_id,
    speed,
    gps: {
      lat: event.telemetry.gps.lat,
      lng: event.telemetry.gps.lng
    }
  }
}

export function annotateVehicleMap<T extends ModalityRule<Exclude<RULE_TYPE, 'rate'>>>(
  policy: ModalityPolicy,
  events: VehicleEventWithTelemetry[],
  geographies: Geography[],
  vehicleMap: { [d: string]: { device: Device; speed?: number; rule_applied?: UUID; rules_matched?: UUID[] } },
  matcherFunction: (rule: T, geographyArr: Geography[], device: Device, event: VehicleEventWithTelemetry) => boolean
): MatchedVehicleInformation[] {
  // For holding the final form of the relevant vehicle, event, and matching rule data.
  const vehiclesFoundMap: { [d: string]: MatchedVehicleInformation } = {}
  const filteredEvents = events.filter(event => {
    return Boolean(vehicleMap[event.device_id])
  }) as VehicleEventWithTelemetry[]
  policy.rules.forEach(rule => {
    filteredEvents.forEach(event => {
      const { device, speed, rule_applied, rules_matched = [] } = vehicleMap[event.device_id]
      const { device_id } = device
      const { rule_id } = rule
      if (matcherFunction(rule as T, geographies, device, event)) {
        if (!vehiclesFoundMap[device_id]) {
          if (!rules_matched.includes(rule_id)) {
            rules_matched.push(rule_id)
          }
          vehiclesFoundMap[device_id] = createMatchedVehicleInformation(
            device,
            event,
            speed,
            rule_applied,
            rules_matched
          )
        } else if (!vehiclesFoundMap[device_id].rules_matched.includes(rule_id)) {
          vehiclesFoundMap[device_id].rules_matched.push(rule_id)
        }
      }
    })
  })
  return Object.values(vehiclesFoundMap)
}

export function getProviderIDs(provider_ids: UUID[] | undefined | null) {
  if (!isDefined(provider_ids)) {
    return Object.keys(providers)
  }
  if (provider_ids === []) {
    return Object.keys(providers)
  }
  return provider_ids
}
