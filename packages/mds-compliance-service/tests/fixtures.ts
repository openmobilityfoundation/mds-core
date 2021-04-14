/**
 * Copyright 2021 City of Los Angeles
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

import { now, days, uuid, minutes } from '@mds-core/mds-utils'
import { ModalityPolicy } from '@mds-core/mds-types'
import { ComplianceSnapshotDomainModel } from '../@types'

export const TIME = 1605821758034

export const COMPLIANCE_SNAPSHOT_ID = 'ec3706e4-9cfd-48d7-8330-150fc733e7e0'
export const PROVIDER_ID = '429b07a6-f752-4784-bc54-a64aa0ae7fec'
export const POLICY_ID = 'afc11dfe-3b0c-473b-9874-0c372909df73'
export const COMPLIANCE_SNAPSHOT: ComplianceSnapshotDomainModel = {
  policy: {
    name: 'a dummy',
    policy_id: POLICY_ID
  },
  provider_id: PROVIDER_ID,
  compliance_as_of: now() - minutes(1),
  compliance_snapshot_id: COMPLIANCE_SNAPSHOT_ID,
  vehicles_found: [
    {
      device_id: '170e2ac5-c786-405a-bef7-ae15c89b3e53',
      state: 'on_trip',
      event_types: ['trip_start'],
      timestamp: now() - minutes(2),
      rules_matched: ['47c8c7d4-14b5-43a3-b9a5-a32ecc2fb2c6'],
      rule_applied: '47c8c7d4-14b5-43a3-b9a5-a32ecc2fb2c6',
      speed: undefined,
      gps: { lat: 34.18319703595646, lng: -118.45538981769323 }
    },
    {
      device_id: 'e18a7f26-e3eb-4320-b82d-9b7f8af181e2',
      state: 'on_trip',
      event_types: ['trip_start'],
      timestamp: now() - minutes(2),
      rules_matched: ['47c8c7d4-14b5-43a3-b9a5-a32ecc2fb2c6'],
      rule_applied: '47c8c7d4-14b5-43a3-b9a5-a32ecc2fb2c6',
      speed: undefined,
      gps: { lat: 34.18541489229653, lng: -118.53515310658483 }
    },
    {
      device_id: 'f99b08a0-79b3-4250-b76f-667b378334fe',
      state: 'on_trip',
      event_types: ['trip_start'],
      timestamp: now() - minutes(2),
      rules_matched: ['47c8c7d4-14b5-43a3-b9a5-a32ecc2fb2c6'],
      rule_applied: '47c8c7d4-14b5-43a3-b9a5-a32ecc2fb2c6',
      speed: undefined,
      gps: { lat: 34.22541868137434, lng: -118.40034283985302 }
    }
  ],
  excess_vehicles_count: 3,
  total_violations: 3
}

export const COMPLIANCE_SNAPSHOT_1: ComplianceSnapshotDomainModel = {
  policy: {
    name: 'a dummy',
    policy_id: 'afc11dfe-3b0c-473b-9874-0c372909df73'
  },
  provider_id: 'aa777467-be73-4710-9c4c-e0bea5dd3ac8',
  compliance_as_of: now() + days(1),
  compliance_snapshot_id: uuid(),
  vehicles_found: [
    {
      device_id: '170e2ac5-c786-405a-bef7-ae15c89b3e53',
      state: 'on_trip',
      event_types: ['trip_start'],
      timestamp: now() + days(1),
      rules_matched: ['47c8c7d4-14b5-43a3-b9a5-a32ecc2fb2c6'],
      rule_applied: '47c8c7d4-14b5-43a3-b9a5-a32ecc2fb2c6',
      speed: undefined,
      gps: { lat: 34.18319703595646, lng: -118.45538981769323 }
    }
  ],
  excess_vehicles_count: 1,
  total_violations: 1
}

export const POLICY_ID_1 = '6d7a9c7e-853c-4ff7-a86f-e17c06d3bd80'
export const POLICY_ID_2 = 'dfe3f757-c43a-4eb6-b85e-abc00f3e8387'
export const PROVIDER_ID_1 = 'c20e08cf-8488-46a6-a66c-5d8fb827f7e0'
export const PROVIDER_ID_2 = '63f13c48-34ff-49d2-aca7-cf6a5b6171c3'

export const COMPLIANCE_SNAPSHOT_ID_1 = '243e1209-61ad-4d7c-8464-db551f1f8c21'

export const COMPLIANCE_SNAPSHOTS_PROVIDER_1_POLICY_1: ComplianceSnapshotDomainModel[] = [
  {
    compliance_as_of: TIME,
    compliance_snapshot_id: COMPLIANCE_SNAPSHOT_ID_1,
    excess_vehicles_count: 1,
    total_violations: 1,
    policy: {
      name: 'Very Low Count Limit',
      policy_id: POLICY_ID_1
    },
    provider_id: PROVIDER_ID_1,
    vehicles_found: [
      {
        device_id: 'f7cf9bbf-0f9e-4497-ab3f-d7358458f939',
        state: 'on_trip',
        event_types: ['trip_start'],
        timestamp: 1605821758034,
        rules_matched: ['2aa6953d-fa8f-4018-9b54-84c8b4b83c6d'],
        rule_applied: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
        speed: undefined,
        gps: { lat: 34.073398166515325, lng: -118.25991238180214 }
      }
    ]
  }
]

export const COMPLIANCE_SNAPSHOTS_PROVIDER_2_POLICY_1: ComplianceSnapshotDomainModel[] = [
  {
    compliance_as_of: TIME + 2,
    compliance_snapshot_id: '39e2171b-a9df-417c-b218-2a82b491a0cc',
    excess_vehicles_count: 6,
    total_violations: 6,
    policy: {
      name: 'Very Low Count Limit',
      policy_id: POLICY_ID_1
    },
    provider_id: PROVIDER_ID_2,
    vehicles_found: [
      {
        device_id: 'f7cf9bbf-0f9e-4497-ab3f-d7358458f939',
        state: 'on_trip',
        event_types: ['trip_start'],
        timestamp: 1605821758034,
        rules_matched: ['2aa6953d-fa8f-4018-9b54-84c8b4b83c6d'],
        rule_applied: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
        speed: undefined,
        gps: { lat: 34.073398166515325, lng: -118.25991238180214 }
      },
      {
        device_id: '31769883-ef60-4323-8360-6b20cda01c96',
        state: 'on_trip',
        event_types: ['trip_start'],
        timestamp: 1605821758044,
        rules_matched: ['2aa6953d-fa8f-4018-9b54-84c8b4b83c6d'],
        rule_applied: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
        speed: undefined,
        gps: { lat: 34.24153417305256, lng: -118.43052998931205 }
      },
      {
        device_id: 'a760d84c-4f6d-433c-a436-6a3abfa6e968',
        state: 'on_trip',
        event_types: ['trip_start'],
        timestamp: 1605821758054,
        rules_matched: ['2aa6953d-fa8f-4018-9b54-84c8b4b83c6d'],
        rule_applied: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
        speed: undefined,
        gps: { lat: 34.260129152395635, lng: -118.31228131867269 }
      },
      {
        device_id: '1335f779-c981-4b67-b6d6-d55a74259747',
        state: 'on_trip',
        event_types: ['trip_start'],
        timestamp: 1605821758064,
        rules_matched: ['2aa6953d-fa8f-4018-9b54-84c8b4b83c6d'],
        rule_applied: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
        speed: undefined,
        gps: { lat: 34.214306602581544, lng: -118.4785189578198 }
      },
      {
        device_id: 'ad81ba8b-0f09-43e1-8c4b-26f2437412b0',
        state: 'on_trip',
        event_types: ['trip_start'],
        timestamp: 1605821758074,
        rules_matched: ['2aa6953d-fa8f-4018-9b54-84c8b4b83c6d'],
        rule_applied: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
        speed: undefined,
        gps: { lat: 34.172787102332386, lng: -118.50261403617911 }
      },
      {
        device_id: '40823011-0a94-41e8-91f1-99e4ddaf2973',
        state: 'on_trip',
        event_types: ['trip_start'],
        timestamp: 1605821758084,
        rules_matched: ['2aa6953d-fa8f-4018-9b54-84c8b4b83c6d'],
        rule_applied: undefined,
        speed: undefined,
        gps: { lat: 34.32580482727351, lng: -118.46685950142516 }
      }
    ]
  }
]

export const COMPLIANCE_SNAPSHOTS_PROVIDER_1_POLICY_2: ComplianceSnapshotDomainModel[] = [
  {
    compliance_as_of: TIME + 1,
    compliance_snapshot_id: '9d4151e2-0d41-48a1-b399-fb5275033d15',
    excess_vehicles_count: 0,
    total_violations: 0,
    policy: {
      name: 'Another Low Count Limit',
      policy_id: POLICY_ID_2
    },
    provider_id: PROVIDER_ID_1,
    vehicles_found: []
  }
]

export const COMPLIANCE_SNAPSHOTS_PROVIDER_2_POLICY_2: ComplianceSnapshotDomainModel[] = [
  {
    compliance_as_of: TIME + 1,
    compliance_snapshot_id: 'ba636406-1898-49a0-b937-6f825b789ee0',
    excess_vehicles_count: 1,
    total_violations: 1,
    policy: {
      name: 'Another Low Count Limit',
      policy_id: POLICY_ID_2
    },
    provider_id: PROVIDER_ID_2,
    vehicles_found: [
      {
        device_id: 'f7cf9bbf-0f9e-4497-ab3f-d7358458f939',
        state: 'on_trip',
        event_types: ['trip_start'],
        timestamp: 1605821758034,
        rules_matched: ['2aa6953d-fa8f-4018-9b54-84c8b4b83c6d'],
        rule_applied: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
        speed: undefined,
        gps: { lat: 34.073398166515325, lng: -118.25991238180214 }
      }
    ]
  },
  {
    compliance_as_of: TIME + 2,
    compliance_snapshot_id: '8cb4d0a8-5edc-46f6-a4e4-a40f5a5f4558',
    excess_vehicles_count: 1,
    total_violations: 1,
    policy: {
      name: 'Another Low Count Limit',
      policy_id: POLICY_ID_2
    },
    provider_id: PROVIDER_ID_2,
    vehicles_found: [
      {
        device_id: 'f7cf9bbf-0f9e-4497-ab3f-d7358458f939',
        state: 'on_trip',
        event_types: ['trip_start'],
        timestamp: 1605821758034,
        rules_matched: ['2aa6953d-fa8f-4018-9b54-84c8b4b83c6d'],
        rule_applied: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
        speed: undefined,
        gps: { lat: 34.073398166515325, lng: -118.25991238180214 }
      }
    ]
  },
  {
    compliance_as_of: TIME + 3,
    compliance_snapshot_id: '58fbefc2-f64f-4740-94a6-244c7233c7da',
    excess_vehicles_count: 0,
    total_violations: 0,
    policy: {
      name: 'Another Low Count Limit',
      policy_id: POLICY_ID_2
    },
    provider_id: PROVIDER_ID_2,
    vehicles_found: []
  },
  {
    compliance_as_of: TIME + 4,
    compliance_snapshot_id: '3a11150b-5d64-4638-bd2d-745905ed8294',
    excess_vehicles_count: 1,
    total_violations: 1,
    policy: {
      name: 'Another Low Count Limit',
      policy_id: POLICY_ID_2
    },
    provider_id: PROVIDER_ID_2,
    vehicles_found: [
      {
        device_id: 'f7cf9bbf-0f9e-4497-ab3f-d7358458f939',
        state: 'on_trip',
        event_types: ['trip_start'],
        timestamp: 1605821758034,
        rules_matched: ['2aa6953d-fa8f-4018-9b54-84c8b4b83c6d'],
        rule_applied: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
        speed: undefined,
        gps: { lat: 34.073398166515325, lng: -118.25991238180214 }
      }
    ]
  }
]

export const COMPLIANCE_SNAPSHOTS = [
  ...COMPLIANCE_SNAPSHOTS_PROVIDER_1_POLICY_1,
  ...COMPLIANCE_SNAPSHOTS_PROVIDER_1_POLICY_2,
  ...COMPLIANCE_SNAPSHOTS_PROVIDER_2_POLICY_1,
  ...COMPLIANCE_SNAPSHOTS_PROVIDER_2_POLICY_2
].sort((c1, c2) => {
  return c1.compliance_as_of - c2.compliance_as_of
})

const GEOGRAPHY_UUID = '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'
export const POLICY1: ModalityPolicy = {
  name: 'Policy 1',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: POLICY_ID_1,
  start_date: TIME - days(30),
  end_date: null,
  publish_date: TIME - days(30),
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      rule_type: 'count',
      rule_id: '7ea0d16e-ad15-4337-9722-9924e3af9146',
      name: 'Greater LA',
      geographies: [GEOGRAPHY_UUID],
      states: { available: [], removed: [], reserved: [], on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 3000,
      minimum: 500
    }
  ]
}

export const POLICY2: ModalityPolicy = {
  name: 'Policy 2',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: POLICY_ID_2,
  start_date: TIME - days(30),
  end_date: null,
  publish_date: TIME - days(30),
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      rule_type: 'count',
      rule_id: 'c29bff02-b260-4dfa-b7de-4b9a38a74cd9',
      name: 'Greater LA',
      geographies: [GEOGRAPHY_UUID],
      states: { available: [], removed: [], reserved: [], on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 3000,
      minimum: 500
    }
  ]
}
