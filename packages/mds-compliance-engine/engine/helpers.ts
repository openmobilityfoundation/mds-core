import cache from '@mds-core/mds-agency-cache'
import { MatchedVehicleInformation } from '@mds-core/mds-compliance-service'
import db from '@mds-core/mds-db'
import { CountPolicy, PolicyDomainModel, Rule, RULE_TYPE, SpeedPolicy, TimePolicy } from '@mds-core/mds-policy-service'
import { providers } from '@mds-core/mds-providers'
import {
  DAYS_OF_WEEK,
  DAY_OF_WEEK,
  Device,
  Geography,
  MicroMobilityVehicleEvent,
  MICRO_MOBILITY_EVENT_STATES_MAP,
  MICRO_MOBILITY_VEHICLE_EVENTS,
  MICRO_MOBILITY_VEHICLE_STATE,
  TaxiVehicleEvent,
  TAXI_EVENT_STATES_MAP,
  TAXI_VEHICLE_EVENTS,
  TAXI_VEHICLE_STATE,
  TIME_FORMAT,
  TNCVehicleEvent,
  TNC_EVENT_STATES_MAP,
  TNC_VEHICLE_EVENT,
  TNC_VEHICLE_STATE,
  UUID,
  VehicleEvent
} from '@mds-core/mds-types'
import { areThereCommonElements, isDefined, now, RuntimeError } from '@mds-core/mds-utils'
import moment from 'moment-timezone'
import { ProviderInputs, VehicleEventWithTelemetry } from '../@types'

const { env } = process

const TWO_DAYS_IN_MS = 172800000

export function getPolicyType(policy: PolicyDomainModel) {
  return policy.rules[0].rule_type
}

export const isCountPolicy = (policy: PolicyDomainModel): policy is CountPolicy =>
  policy.rules.every(({ rule_type }) => rule_type === 'count')

export const isTimePolicy = (policy: PolicyDomainModel): policy is TimePolicy =>
  policy.rules.every(({ rule_type }) => rule_type === 'time')

export const isSpeedPolicy = (policy: PolicyDomainModel): policy is SpeedPolicy =>
  policy.rules.every(({ rule_type }) => rule_type === 'speed')

export function generateDeviceMap(devices: Device[]): { [d: string]: Device } {
  return [...devices].reduce((deviceMapAcc: { [d: string]: Device }, device: Device) => {
    return Object.assign(deviceMapAcc, { [device.device_id]: device })
  }, {})
}

export function isPolicyUniversal(policy: PolicyDomainModel) {
  return !policy.provider_ids || policy.provider_ids.length === 0
}

export async function getAllInputs() {
  const inputs = await Promise.all(Object.keys(providers).map(provider_id => getProviderInputs(provider_id)))
  return inputs.reduce((acc: ProviderInputs, cur) => {
    acc[cur.provider_id] = cur
    return acc
  }, {})
}

export async function getProviderInputs(provider_id: string) {
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
  return { filteredEvents, deviceMap, provider_id }
}

export function isPolicyActive(policy: PolicyDomainModel, end_time: number = now()): boolean {
  if (policy.end_date === null) {
    return end_time >= policy.start_date
  }
  return end_time >= policy.start_date && end_time <= policy.end_date
}

export function isRuleActive(rule: Rule<Exclude<RULE_TYPE, 'rate'>>): boolean {
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

export function isInVehicleTypes(rule: Rule<Exclude<RULE_TYPE, 'rate'>>, device: Device): boolean {
  return !rule.vehicle_types || (rule.vehicle_types && rule.vehicle_types.includes(device.vehicle_type))
}

// Take a list of policies, and eliminate all those that have been superseded. Returns
// policies that have not been superseded.
// TODO: move to mds-policly-service
export function getSupersedingPolicies(policies: PolicyDomainModel[]): PolicyDomainModel[] {
  const prev_policies: string[] = policies.reduce((prev_policies_acc: string[], policy: PolicyDomainModel) => {
    if (policy.prev_policies) {
      prev_policies_acc.push(...policy.prev_policies)
    }
    return prev_policies_acc
  }, [])
  return policies.filter((policy: PolicyDomainModel) => {
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

export function annotateVehicleMap<T extends Rule<Exclude<RULE_TYPE, 'rate'>>>(
  policy: PolicyDomainModel,
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
  if (!isDefined(provider_ids) || !Array.isArray(provider_ids)) {
    return Object.keys(providers)
  }
  if (provider_ids.length < 1) {
    return Object.keys(providers)
  }
  return provider_ids
}

/**
 * The rule matches this event if a transient event_type and possible resultant states,
 * or the final event_type and explicitly encoded vehicle_state match with the rule's status definitions.
 * e.g. if the rule states are { reserved: [] } and there's an event with event_types
 *      [trip_end, reservation_start, trip_start], there's an implication
 *      that the vehicle entered the reserved state after reservation_start,
 *      even if the final state of the event is on_trip, and the rule will match.
 *
 * @example Matching transient `event_type`
 * ```typescript
 * isInStatesOrEvents({ states: { reserved: [] } }, { event_types: ['trip_end', 'reservation_start', 'trip_start'], vehicle_state: 'on_trip' }) => true
 * ```
 * @example State matching for transient `event_type` 'off_hours', but `event_type` not matched with explicit `event_type` in rule
 * ```typescript
 * isInStatesOrEvents({ states: { non_operational: ['maintenance'] } }, { event_types: ['trip_end', 'off_hours', 'on_hours'], vehicle_state: 'available' }) => false
 * ```
 * @example Match for last `event_type` and encoded `vehicle_state`, with explicit `event_type` in rule
 * ```typescript
 * isInStatesOrEvents({ states: { available: ['on_hours'] } }, { event_types: ['trip_end', 'off_hours', 'on_hours'], vehicle_state: 'available' }) => true
 * ```
 * @example Match for last `event_type` and encoded `vehicle_state`, with catch-all in rule
 * ```typescript
 * isInStatesOrEvents({ states: { available: [] } }, { event_types: ['on_hours'], vehicle_state: 'available' }) => true
 * ```
 */
export function isInStatesOrEvents(
  rule: Pick<Rule, 'states'>,
  device: Pick<Device, 'modality'>,
  event: VehicleEvent
): boolean {
  const { states } = rule
  // If no states are specified, then the rule applies to all VehicleStates.
  if (states === null || states === undefined) {
    return true
  }

  /**
   * State encoded in the event payload (default acc in the reducer) + states that it is
   * possible to transition into with any transient event_types
   */
  const possibleStates = getPossibleStates(device, event)

  return possibleStates.some(state => {
    // Explicit events encoded in rule for that state (if any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchableEvents: string[] | undefined = state in states ? (states as any)[state] : undefined //FIXME should not have to use an any cast here

    /**
     * If event_types not encoded in rule, assume state match.
     * If event_types encoded in rule, see if event.event_types contains a match.
     */
    if (
      matchableEvents !== undefined &&
      (matchableEvents.length === 0 || areThereCommonElements(matchableEvents, event.event_types))
    ) {
      return true
    }
    return false
  })
}

export const getPossibleStates = (device: Pick<Device, 'modality'>, event: VehicleEvent) => {
  if (isMicroMobilityEvent(device, event)) {
    const { event_types, vehicle_state } = event
    // All event_types except the last (in most cases this will be an empty list)
    const transientEventTypes = event_types.splice(0, -1)

    return transientEventTypes.reduce(
      (acc: MICRO_MOBILITY_VEHICLE_STATE[], event_type) => {
        return acc.concat(MICRO_MOBILITY_EVENT_STATES_MAP[event_type])
      },
      [vehicle_state]
    )
  }
  if (isTaxiEvent(device, event)) {
    const { event_types, vehicle_state } = event
    // All event_types except the last (in most cases this will be an empty list)
    const transientEventTypes = event_types.splice(0, -1)

    return transientEventTypes.reduce(
      (acc: TAXI_VEHICLE_STATE[], event_type) => {
        return acc.concat(TAXI_EVENT_STATES_MAP[event_type])
      },
      [vehicle_state]
    )
  }
  if (isTncEvent(device, event)) {
    const { event_types, vehicle_state } = event
    // All event_types except the last (in most cases this will be an empty list)
    const transientEventTypes = event_types.splice(0, -1)

    return transientEventTypes.reduce(
      (acc: TNC_VEHICLE_STATE[], event_type) => {
        return acc.concat(TNC_EVENT_STATES_MAP[event_type])
      },
      [vehicle_state]
    )
  }

  return [event.vehicle_state]
}
export const isSubset = <T extends Array<string>, U extends Readonly<Array<string>>>(as: T, bs: U) => {
  return as.every(a => bs.includes(a))
}

const isMicroMobilityEvent = (
  { modality }: Pick<Device, 'modality'>,
  event: VehicleEvent
): event is MicroMobilityVehicleEvent => {
  const { event_types } = event
  return modality === 'micromobility' && isSubset(event_types, MICRO_MOBILITY_VEHICLE_EVENTS)
}

const isTaxiEvent = ({ modality }: Pick<Device, 'modality'>, event: VehicleEvent): event is TaxiVehicleEvent => {
  const { event_types } = event
  return modality === 'taxi' && isSubset(event_types, TAXI_VEHICLE_EVENTS)
}

const isTncEvent = ({ modality }: Pick<Device, 'modality'>, event: VehicleEvent): event is TNCVehicleEvent => {
  const { event_types } = event
  return modality === 'tnc' && isSubset(event_types, TNC_VEHICLE_EVENT)
}
