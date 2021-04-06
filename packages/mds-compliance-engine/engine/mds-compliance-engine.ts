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

import { Device, Geography, Policy, UUID, RULE_TYPES, VehicleEvent } from '@mds-core/mds-types'

import { now, UnsupportedTypeError, uuid } from '@mds-core/mds-utils'
import { ComplianceSnapshotDomainModel } from '@mds-core/mds-compliance-service/@types'
import { VehicleEventWithTelemetry } from '../@types'
import { getProviderIDs, getComplianceInputs, isPolicyActive } from './helpers'

import { processCountPolicy } from './count_processors'
import { processSpeedPolicy } from './speed_processors'
import { processTimePolicy } from './time_processors'

function getProcessorType(rule_type: string) {
  switch (rule_type) {
    case RULE_TYPES.count: {
      return processCountPolicy
    }
    case RULE_TYPES.speed: {
      return processSpeedPolicy
    }
    case RULE_TYPES.time: {
      return processTimePolicy
    }
    default: {
      throw new UnsupportedTypeError(`Policy type ${rule_type} unsupported`)
    }
  }
}

export async function createComplianceSnapshot(
  provider_id: UUID,
  policy: Policy,
  geographies: Geography[],
  filteredEvents: VehicleEvent[],
  deviceMap: { [d: string]: Device }
): Promise<ComplianceSnapshotDomainModel | undefined> {
  const processorFunction = getProcessorType(policy.rules[0].rule_type)
  const compliance_as_of = now()
  const complianceResult = processorFunction(
    policy,
    filteredEvents as VehicleEventWithTelemetry[],
    geographies,
    deviceMap
  )
  if (complianceResult) {
    const complianceSnapshot: ComplianceSnapshotDomainModel = {
      compliance_as_of,
      compliance_snapshot_id: uuid(),
      excess_vehicles_count: complianceResult.excess_vehicles_count,
      total_violations: complianceResult.total_violations,
      policy: {
        name: policy.name,
        policy_id: policy.policy_id
      },
      provider_id,
      vehicles_found: complianceResult.vehicles_found
    }
    return complianceSnapshot
  }
}

/*
 * The geographies should be the result of calling
 * `await readGeographies({ get_published: true })`
 */
export async function processPolicy(policy: Policy, geographies: Geography[]) {
  if (isPolicyActive(policy)) {
    const provider_ids = getProviderIDs(policy.provider_ids)
    const ComplianceSnapshotPromises = provider_ids.map(async provider_id => {
      const { filteredEvents, deviceMap } = await getComplianceInputs(provider_id)
      return createComplianceSnapshot(provider_id, policy, geographies, filteredEvents, deviceMap)
    })
    const results = await Promise.all(ComplianceSnapshotPromises)
    // filter out undefined results
    return results.filter(result => !!result)
  }
  return []
}
