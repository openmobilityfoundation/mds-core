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
  CountRule,
  Device,
  Geography,
  Policy,
  Rule,
  SpeedRule,
  TimeRule,
  VehicleEvent,
  DAY_OF_WEEK,
  TIME_FORMAT,
  DAYS_OF_WEEK,
  UUID
} from '@mds-core/mds-types'
import { pointInShape, getPolygon, isInStatesOrEvents, now, RuntimeError, RULE_UNIT_MAP } from '@mds-core/mds-utils'
import moment from 'moment-timezone'
import {
  MatchedVehiclePlusRule,
  CountMatch,
  Compliance,
  MatchedVehicle,
  SpeedMatch,
  TimeMatch,
  ComplianceResponse
} from './types'

const { env } = process

const TWO_DAYS_IN_MS = 172800000

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

  if (!rule.days || rule.days.includes(Object.values(DAYS_OF_WEEK)[local_time.day()] as DAY_OF_WEEK)) {
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

function getViolationsArray(map: { [key: string]: MatchedVehiclePlusRule }) {
  return Object.values(map)
}

function processCountRule(
  rule: CountRule,
  events: VehicleEvent[],
  geographies: Geography[],
  devices: { [d: string]: Device }
): Compliance & { matches: CountMatch[] | null } {
  const maximum = rule.maximum || Number.POSITIVE_INFINITY
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
                  matched_vehicles_acc.push({ device, event })
                }
              }
            }
            return matched_vehicles_acc
          },
          []
        )
        matches_acc.push({
          geography_id: geography,
          measured: maximum && matched_vehicles.length > maximum ? maximum : matched_vehicles.length,
          matched_vehicles
        })
        return matches_acc
      },
      []
    )
    return { rule, matches }
  }
  return { rule, matches: [] }
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
                matched_vehicle: { device, event }
              })
            }
          }
        }
      })
      return matches_acc
    }, [])
    return { rule, matches }
  }
  return { rule, matches: [] }
}

// TODO Add types for speed policies
/* eslint-disable @typescript-eslint/no-explicit-any */
function processSpeedRule(
  rule: SpeedRule,
  events: VehicleEvent[],
  geographies: Geography[],
  devices: { [d: string]: Device }
): Compliance & { matches: SpeedMatch[] | null } {
  if (isRuleActive(rule)) {
    const matches_result: SpeedMatch[] = rule.geographies.reduce((matches: any[], geography: string) => {
      events.forEach((event: VehicleEvent) => {
        const device: Device | undefined = devices[event.device_id]
        if (event.telemetry && device) {
          if (
            isInStatesOrEvents(rule, event) &&
            isInVehicleTypes(rule, device) &&
            event.telemetry.gps.speed &&
            pointInShape(event.telemetry.gps, getPolygon(geographies, geography)) &&
            (!rule.maximum || event.telemetry.gps.speed >= rule.maximum)
          ) {
            matches.push({
              measured: event.telemetry.gps.speed,
              geography_id: geography,
              matched_vehicle: { device, event }
            })
          }
        }
      })
      return matches
    }, [])
    return { rule, matches: matches_result }
  }
  return { rule, matches: [] }
}

function processPolicy(
  policy: Policy,
  events: VehicleEvent[],
  geographies: Geography[],
  devices: { [d: string]: Device }
): ComplianceResponse | undefined {
  if (isPolicyActive(policy)) {
    const sortedEvents = events.sort((e_1, e_2) => {
      return e_1.timestamp - e_2.timestamp
    })
    const vehiclesToFilter: MatchedVehicle[] = []
    let overflowVehiclesMap: { [key: string]: MatchedVehiclePlusRule } = {}
    let countVehiclesMap: { [d: string]: MatchedVehiclePlusRule } = {}
    let countViolations = 0
    const timeVehiclesMap: { [d: string]: MatchedVehiclePlusRule } = {}
    const speedingVehiclesMap: { [d: string]: MatchedVehiclePlusRule } = {}
    const compliance: Compliance[] = policy.rules.reduce((compliance_acc: Compliance[], rule: Rule): Compliance[] => {
      // Even if a vehicle breaks two rules, it will be counted in violation of only the first rule.
      // So we must filter it out so it's not included in the processing of any other policy rules.
      vehiclesToFilter.forEach((vehicle: MatchedVehicle) => {
        /* eslint-reason need to remove matched vehicles */
        /* eslint-disable-next-line no-param-reassign */
        delete devices[vehicle.device.device_id]
      })

      switch (rule.rule_type) {
        case 'count': {
          const comp: Compliance & { matches: CountMatch[] } = processCountRule(
            rule,
            sortedEvents,
            geographies,
            devices
          )

          const compressedComp = {
            rule,
            matches: comp.matches
              ? comp.matches.reduce((acc: { measured: number; geography_id: UUID }[], inst: CountMatch) => {
                  const { measured, geography_id } = inst
                  return [...acc, { measured, geography_id }]
                }, [])
              : []
          }

          const bucketMap = comp.matches.reduce(
            (acc2: { matched: MatchedVehicle[]; overflowed: MatchedVehiclePlusRule[] }[], match) => {
              return [
                ...acc2,
                match.matched_vehicles.reduce(
                  (
                    acc: { matched: MatchedVehicle[]; overflowed: MatchedVehiclePlusRule[] },
                    match_instance: MatchedVehicle,
                    i: number
                  ) => {
                    // If the rule has a defined maximum, use it, even if 0
                    const maximum = rule.maximum == null ? Number.POSITIVE_INFINITY : rule.maximum
                    if (maximum && i < maximum) {
                      if (overflowVehiclesMap[match_instance.device.device_id]) {
                        delete overflowVehiclesMap[match_instance.device.device_id]
                      }
                      if (countVehiclesMap[match_instance.device.device_id]) {
                        delete countVehiclesMap[match_instance.device.device_id]
                      }
                      acc.matched.push(match_instance)
                    } else {
                      acc.overflowed.push({ ...match_instance, rule_id: rule.rule_id })
                    }
                    return acc
                  },
                  { matched: [], overflowed: [] }
                )
              ]
            },
            [{ matched: [], overflowed: [] }]
          )

          const vehiclesMatched = bucketMap.reduce((acc: MatchedVehicle[], map) => {
            return [...acc, ...map.matched]
          }, [])
          vehiclesToFilter.push(...vehiclesMatched)

          const overflowVehicles = bucketMap.reduce((acc: MatchedVehiclePlusRule[], map) => {
            return [...acc, ...map.overflowed]
          }, [])

          // Add overflowed vehicles to the overall overflowVehiclesMap.
          overflowVehiclesMap = {
            ...overflowVehiclesMap,
            ...overflowVehicles.reduce(
              (acc: { [key: string]: MatchedVehiclePlusRule }, match: MatchedVehiclePlusRule) => {
                acc[match.device.device_id] = match
                return acc
              },
              {}
            )
          }

          // only vehicles in count maximum violation are in overflow
          // no vehicles are in violation if it's a mininimum violation,
          // but # of violations goes up
          const minimum = rule.minimum == null ? Number.NEGATIVE_INFINITY : rule.minimum

          if (overflowVehicles.length > 0) {
            countVehiclesMap = { ...countVehiclesMap, ...overflowVehiclesMap }
            countViolations += overflowVehicles.length
          } else if (vehiclesMatched.length < minimum) {
            countViolations += minimum - vehiclesMatched.length
          }

          compliance_acc.push(compressedComp)

          break
        }
        case 'time': {
          const comp: Compliance & { matches: TimeMatch[] | null } = processTimeRule(
            rule,
            sortedEvents,
            geographies,
            devices
          )
          compliance_acc.push(comp)

          const timeVehicles = comp.matches
            ? comp.matches.reduce((acc: MatchedVehicle[], match: TimeMatch) => {
                const { matched_vehicle } = match
                timeVehiclesMap[matched_vehicle.device.device_id] = { ...matched_vehicle, ...{ rule_id: rule.rule_id } }
                acc.push(matched_vehicle)
                return acc
              }, [])
            : []

          vehiclesToFilter.push(...timeVehicles)
          break
        }
        case 'speed':
          {
            const comp: Compliance & { matches: SpeedMatch[] | null } = processSpeedRule(
              rule,
              sortedEvents,
              geographies,
              devices
            )
            compliance_acc.push(comp)
            const speedingVehicles = comp.matches
              ? comp.matches.reduce((acc: MatchedVehicle[], match: SpeedMatch) => {
                  acc.push(match.matched_vehicle)
                  return acc
                }, [])
              : []
            vehiclesToFilter.push(...speedingVehicles)

            speedingVehicles.forEach(vehicle => {
              speedingVehiclesMap[vehicle.device.device_id] = { ...vehicle, ...{ rule_id: rule.rule_id } }
            })
          }
          break
        default:
          compliance_acc.push({ rule, matches: [] })
      }
      return compliance_acc
    }, [])

    const countVehicles = getViolationsArray(countVehiclesMap)
    const timeVehicles = getViolationsArray(timeVehiclesMap)
    const speedingVehicles = getViolationsArray(speedingVehiclesMap)

    return {
      policy,
      compliance,
      total_violations: countViolations + timeVehicles.length + speedingVehicles.length,
      vehicles_in_violation: [...countVehicles, ...timeVehicles, ...speedingVehicles]
    }
  }
}

// Take a list of policies, and eliminate all those that have been superseded. Returns
// policies that have not been superseded.
function getSupersedingPolicies(policies: Policy[]): Policy[] {
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

function getRecentEvents(events: VehicleEvent[], end_time = now()): VehicleEvent[] {
  return events.filter((event: VehicleEvent) => {
    /* Keep events that are less than two days old */
    return event.timestamp > end_time - TWO_DAYS_IN_MS
  })
}

export { processPolicy, getSupersedingPolicies, getRecentEvents }
