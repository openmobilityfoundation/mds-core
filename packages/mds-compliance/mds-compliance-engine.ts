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
  Compliance,
  ComplianceResponse,
  CountMatch,
  CountRule,
  Device,
  Geography,
  Policy,
  Rule,
  TimeMatch,
  TimeRule,
  VehicleEvent,
  MatchedVehicle
} from 'mds'
import { EVENT_STATUS_MAP, RULE_UNIT_MAP, DAY_OF_WEEK, VEHICLE_STATUS } from 'mds-enums'
import { pointInShape, getPolygon, isInStatesOrEvents, now } from 'mds-utils'
import moment from 'moment-timezone'
import { RuntimeError } from './exceptions'

const { env } = process

const TWO_DAYS_IN_MS = 172800000

const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] // FIXME move to mds-enums

const TIME_FORMAT = 'HH:mm:ss' // FIXME move to mds-enums

function isPolicyActive(policy: Policy, end_time: number = now()): boolean {
  if (policy.end_date === null) {
    return end_time >= policy.start_date
  }
  return end_time >= policy.start_date && end_time <= policy.end_date
}

function isRuleActive(rule: Rule): boolean {
  if (!env.TIMEZONE) {
    throw new RuntimeError('TIMEZONE environment variable must be declared!')
  }

  if (!moment.tz.names().includes(env.TIMEZONE)) {
    throw new RuntimeError(`TIMEZONE environment variable ${env.TIMEZONE} is not a valid timezone!`)
  }

  const local_time = moment().tz(env.TIMEZONE)

  if (!rule.days || rule.days.includes(DAYS_OF_WEEK[local_time.day()] as DAY_OF_WEEK)) {
    if (!rule.start_time || local_time.isAfter(moment(rule.start_time, TIME_FORMAT))) {
      if (!rule.end_time || local_time.isBefore(moment(rule.end_time, TIME_FORMAT))) {
        return true
      }
    }
  }
  return false
}

function isInVehicleTypes(rule: Rule, device: Device): boolean {
  return !rule.vehicle_types || (rule.vehicle_types && rule.vehicle_types.includes(device.type))
}

function processCountRule(
  rule: CountRule,
  events: VehicleEvent[],
  geographies: Geography[],
  devices: { [d: string]: Device }
): Compliance & { matches: CountMatch[] | null } {
  if (isRuleActive(rule)) {
    const matches: CountMatch[] = rule.geographies.reduce(
      (matches_acc: CountMatch[], geography: string): CountMatch[] => {
        const matched_vehicles: MatchedVehicle[] = events.reduce(
          (matched_vehicles_acc: MatchedVehicle[], event: VehicleEvent): MatchedVehicle[] => {
            const device: Device | undefined = devices[event.device_id]
            if (event.telemetry && device) {
              if (isInStatesOrEvents(rule, event) && isInVehicleTypes(rule, device)) {
                const poly = getPolygon(geographies, geography)
                if (poly && pointInShape(event.telemetry.gps, poly)) {
                  // push devices that are in violation
                  matched_vehicles_acc.push({
                    device_id: device.device_id,
                    provider_id: device.provider_id,
                    vehicle_id: device.vehicle_id,
                    vehicle_type: device.type,
                    vehicle_status: EVENT_STATUS_MAP[event.event_type] as VEHICLE_STATUS,
                    gps: {
                      lat: event.telemetry.gps.lat,
                      lng: event.telemetry.gps.lng
                    }
                  })
                }
              }
            }
            return matched_vehicles_acc
          },
          []
        )
        if (
          (rule.minimum !== undefined && rule.minimum !== null && matched_vehicles.length <= rule.minimum) ||
          (rule.maximum !== undefined && rule.maximum !== null && matched_vehicles.length >= rule.maximum)
        ) {
          matches_acc.push({
            geography_id: geography,
            measured: matched_vehicles.length,
            matched_vehicles
          })
        }
        return matches_acc
      },
      []
    )
    return { rule, matches }
  }
  return { rule, matches: null }
}

function processTimeRule(
  rule: TimeRule,
  events: VehicleEvent[],
  geographies: Geography[],
  devices: { [d: string]: Device }
): Compliance & { matches: TimeMatch[] | null } {
  if (isRuleActive(rule)) {
    const matches: TimeMatch[] = rule.geographies.reduce((matches_acc: TimeMatch[], geography: string): TimeMatch[] => {
      events.forEach((event: VehicleEvent) => {
        const device: Device | undefined = devices[event.device_id]
        if (event.telemetry && device) {
          if (
            isInStatesOrEvents(rule, event) &&
            isInVehicleTypes(rule, device) &&
            (!rule.maximum || (now() - event.timestamp) / RULE_UNIT_MAP[rule.rule_units] >= rule.maximum)
          ) {
            const poly = getPolygon(geographies, geography)
            if (poly && pointInShape(event.telemetry.gps, poly)) {
              matches_acc.push({
                measured: now() - event.timestamp,
                geography_id: geography,
                matched_vehicle: {
                  device_id: device.device_id,
                  provider_id: device.provider_id,
                  vehicle_id: device.vehicle_id,
                  vehicle_type: device.type,
                  vehicle_status: EVENT_STATUS_MAP[event.event_type] as VEHICLE_STATUS,
                  gps: {
                    lat: event.telemetry.gps.lat,
                    lng: event.telemetry.gps.lng
                  }
                }
              })
            }
          }
        }
      })
      return matches_acc
    }, [])
    return { rule, matches }
  }
  return { rule, matches: null }
}

// FIXME Add types for speed policies
// function processSpeedPolicy(policy: Policy, events: VehicleEvent[], geographies: Geography[], devices: Device[]): any {
//   const compliance: any[] = policy.rules.reduce((compliance_acc: any[], rule: Rule) => {
//     if (isRuleActive(rule)) {
//       const matches: any[] = rule.geographies.reduce((matches: any[], geography: string) => {
//         events.forEach((event: VehicleEvent) => {
//           const device: Device | undefined = devices.find((device: Device) => {
//             return device.device_id === event.device_id
//           })
//           if (event.telemetry && device) {
//             if (
//               Object.keys(rule.statuses).includes(EVENT_STATUS_MAP[event.event_type]) &&
//              (rule.statuses[EVENT_STATUS_MAP[event.event_type]].length === 0 ||
//                rule.statuses[EVENT_STATUS_MAP[event.event_type]].includes(event.event_type)) &&&
//               (!rule.vehicle_types || rule.vehicle_types.includes(device.type)) &&
//               event.telemetry.gps.speed &&
//               pointInShape(event.telemetry.gps, getPolygon(geographies, geography)) &&
//               (!rule.maximum || event.telemetry.gps.speed >= rule.maximum)
//             ) {
//               matches.push({
//                 match: {
//                   measured: event.telemetry.gps.speed
//                 }
//               })
//             }
//           }
//         })
//         return matches
//       }, [])
//       compliance_acc.push({ rule, matches })
//     }
//     return compliance_acc
//   }, [])
//   return { policy, compliance }
// }

function processPolicy(
  policy: Policy,
  events: VehicleEvent[],
  geographies: Geography[],
  devices: { [d: string]: Device }
): ComplianceResponse | undefined {
  if (isPolicyActive(policy)) {
    const vehiclesToFilter: MatchedVehicle[] = []
    const compliance: Compliance[] = policy.rules.reduce((compliance_acc: Compliance[], rule: Rule): Compliance[] => {
      vehiclesToFilter.forEach((vehicle: MatchedVehicle) => {
        /* eslint-reason need to remove matched vehicles */
        /* eslint-disable-next-line no-param-reassign */
        delete devices[vehicle.device_id]
      })
      switch (rule.rule_type) {
        case 'count': {
          const comp: Compliance & { matches: CountMatch[] | null } = processCountRule(
            rule,
            events,
            geographies,
            devices
          )
          compliance_acc.push(comp)
          vehiclesToFilter.push(
            ...(comp.matches
              ? comp.matches.reduce((acc: MatchedVehicle[], match: CountMatch) => {
                  acc.push(...match.matched_vehicles)
                  return acc
                }, [])
              : [])
          )
          break
        }
        case 'time': {
          const comp: Compliance & { matches: TimeMatch[] | null } = processTimeRule(rule, events, geographies, devices)
          compliance_acc.push(comp)
          vehiclesToFilter.push(
            ...(comp.matches
              ? comp.matches.reduce((acc: MatchedVehicle[], match: TimeMatch) => {
                  acc.push(match.matched_vehicle)
                  return acc
                }, [])
              : [])
          )
          break
        }
        case 'speed':
          compliance_acc.push({ rule, matches: null })
          break
        default:
          compliance_acc.push({ rule, matches: null })
      }
      return compliance_acc
    }, [])
    return { policy, compliance }
  }
}

function filterPolicies(policies: Policy[]): Policy[] {
  const prev_policies: string[] = policies.reduce((prev_policies_acc: string[], policy: Policy) => {
    if (policy.prev_policies) {
      prev_policies_acc.push(...policy.prev_policies)
    }
    return prev_policies_acc
  }, [])
  return policies.filter((policy: Policy) => {
    return !prev_policies.includes(policy.policy_id)
  })
}

function filterEvents(events: VehicleEvent[], end_time = now()): VehicleEvent[] {
  return events.filter((event: VehicleEvent) => {
    return event.timestamp > end_time - TWO_DAYS_IN_MS
  })
}

export { processPolicy, filterPolicies, filterEvents }
