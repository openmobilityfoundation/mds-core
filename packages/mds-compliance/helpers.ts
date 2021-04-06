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

import { Policy, Geography, UUID, Timestamp, Device } from '@mds-core/mds-types'
import cache from '@mds-core/mds-agency-cache'
import db from '@mds-core/mds-db'
import { AllowedProviderIDs } from './constants'
import * as compliance_engine from './mds-compliance-engine'

function isPolicyUniversal(policy: Policy) {
  return !policy.provider_ids || policy.provider_ids.length === 0
}

export function clientCanViewPolicyCompliance(
  provider_id: string,
  queried_provider_id: string | undefined,
  policy: Policy
): boolean {
  return (
    policy &&
    // True if the client is looking at a policy that applies to them
    ((policy.provider_ids && policy.provider_ids.includes(provider_id)) ||
      // True if a policy has no provider_ids, meaning it applies to every provider
      isPolicyUniversal(policy) ||
      /* True if the client is one of the allowed providers, and either the policy applies to the
       * provider that was queried for, or the policy applies to every provider
       */
      (AllowedProviderIDs.includes(provider_id) &&
        ((policy.provider_ids &&
          policy.provider_ids.length !== 0 &&
          queried_provider_id &&
          policy.provider_ids.includes(queried_provider_id)) ||
          isPolicyUniversal(policy))))
  )
}

export async function getComplianceInputs(provider_id: string | undefined, timestamp: Timestamp | undefined) {
  const [geographies, deviceRecords] = await Promise.all([
    db.readGeographies() as Promise<Geography[]>,
    db.readDeviceIds(provider_id)
  ])
  const deviceIdSubset = deviceRecords.map((record: { device_id: UUID; provider_id: UUID }) => record.device_id)
  const devices = await cache.readDevices(deviceIdSubset)
  // If a timestamp was supplied, the data we want is probably old enough it's going to be in the db
  const events = timestamp
    ? await db.readHistoricalEvents({ provider_id, end_date: timestamp })
    : await cache.readEvents(deviceIdSubset)

  const deviceMap = devices.reduce((map: { [d: string]: Device }, device) => {
    return device ? Object.assign(map, { [device.device_id]: device }) : map
  }, {})

  const filteredEvents = compliance_engine.getRecentEvents(events)
  return { filteredEvents, geographies, deviceMap }
}
