import {
  Device,
  Geography,
  ModalityPolicy,
  RULE_TYPES,
  SpeedRule,
  Telemetry,
  UUID,
  VehicleEvent
} from '@mds-core/mds-types'
import { getPolygon, isInStatesOrEvents, pointInShape, UnsupportedTypeError } from '@mds-core/mds-utils'
import { ComplianceEngineResult, VehicleEventWithTelemetry } from '../@types'
import { annotateVehicleMap, getPolicyType, isInVehicleTypes, isRuleActive } from './helpers'

export function isSpeedRuleMatch(
  rule: SpeedRule,
  geographies: Geography[],
  device: Device,
  event: VehicleEventWithTelemetry
) {
  if (isRuleActive(rule)) {
    for (const geography of rule.geographies) {
      if (
        isInStatesOrEvents(rule, device, event) &&
        isInVehicleTypes(rule, device) &&
        event.telemetry.gps.speed &&
        pointInShape(event.telemetry.gps, getPolygon(geographies, geography)) &&
        (!rule.maximum || event.telemetry.gps.speed >= rule.maximum)
      ) {
        return true
      }
    }
  }
  return false
}

export function processSpeedPolicy(
  policy: ModalityPolicy,
  events: (VehicleEvent & { telemetry: Telemetry })[],
  geographies: Geography[],
  devicesToCheck: { [d: string]: Device }
): ComplianceEngineResult | undefined {
  if (getPolicyType(policy) !== RULE_TYPES.speed) {
    throw new UnsupportedTypeError(`${getPolicyType(policy)} with id ${policy.policy_id} submitted to speed processor`)
  }
  const matchedVehicles: {
    [d: string]: { device: Device; speed?: number; rule_applied: UUID; rules_matched: UUID[] }
  } = {}
  policy.rules.forEach(rule => {
    events.forEach(event => {
      if (devicesToCheck[event.device_id]) {
        const device = devicesToCheck[event.device_id]
        if (isSpeedRuleMatch(rule as SpeedRule, geographies, device, event)) {
          matchedVehicles[device.device_id] = {
            device,
            rule_applied: rule.rule_id,
            rules_matched: [rule.rule_id],
            speed: event.telemetry.gps.speed as number
          }
          /* eslint-reason need to remove matched vehicles */
          /* eslint-disable-next-line no-param-reassign */
          delete devicesToCheck[device.device_id]
        }
      }
    })
  })
  const matchedVehiclesArr = annotateVehicleMap(policy, events, geographies, matchedVehicles, isSpeedRuleMatch)
  return {
    vehicles_found: matchedVehiclesArr,
    excess_vehicles_count: 0,
    total_violations: matchedVehiclesArr.length
  }
}
