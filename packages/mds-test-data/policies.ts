import { ModalityPolicy } from '@mds-core/mds-types'
import { days, now, uuid } from '@mds-core/mds-utils'

export const GEOGRAPHY_UUID = '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'
export const GEOGRAPHY2_UUID = '722b99ca-65c2-4ed6-9be1-056c394fadbf'
export const NONEXISTENT_GEOGRAPHY_UUID = '991d4062-6e5e-4ac1-bcd1-1a3bd6d7f63c'

export const POLICY_UUID = '72971a3d-876c-41ea-8e48-c9bb965bbbcc'
export const POLICY2_UUID = '5681364c-2ebf-4ba2-9ca0-50f4be2a5876'
export const POLICY3_UUID = '42d899b8-255d-4109-aa67-abfb9157b46a'
export const POLICY4_UUID = 'de15243e-dfaa-4a88-b21a-db7cd2c3dc78'
export const SUPERSEDING_POLICY_UUID = 'd6371e73-6a8c-4b51-892f-78849d66ee2b'

export const START_ONE_MONTH_AGO = now() - (now() % days(1)) - days(30)
export const START_ONE_WEEK_AGO = now() - (now() % days(1)) - days(7)
export const START_YESTERDAY = now() - (now() % days(1))
export const START_NOW = now()
export const START_TOMORROW = now() + (now() % days(1))
export const START_ONE_MONTH_FROM_NOW = now() - (now() % days(1)) + days(30)

export const POLICY_JSON: ModalityPolicy = {
  // TODO guts
  name: 'MDSPolicy 1',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: POLICY_UUID,
  start_date: START_TOMORROW,
  end_date: null,
  publish_date: START_NOW,
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

export const SUPERSEDING_POLICY_JSON: ModalityPolicy = {
  // TODO guts
  name: 'Supersedes MDSPolicy 1',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: SUPERSEDING_POLICY_UUID,
  start_date: START_YESTERDAY,
  end_date: null,
  prev_policies: [POLICY_UUID],
  provider_ids: [],
  rules: [
    {
      rule_type: 'count',
      rule_id: 'f518e886-ec06-4eb9-ad19-d91d34ee73d3',
      name: 'Greater LA',
      geographies: [GEOGRAPHY_UUID],
      states: { available: [], removed: [], reserved: [], on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 1000,
      minimum: 500
    }
  ]
}

// in the past
export const POLICY2_JSON: ModalityPolicy = {
  // TODO guts
  name: 'MDSPolicy 2',
  description: 'LADOT Idle Time Limitations',
  policy_id: POLICY2_UUID,
  start_date: START_ONE_MONTH_AGO,
  end_date: START_ONE_WEEK_AGO,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA (rentable)',
      rule_id: '2df37be2-b1cb-4152-9bb9-b23472a43b05',
      rule_type: 'time',
      rule_units: 'minutes',
      geographies: [GEOGRAPHY_UUID],
      states: { available: [], reserved: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 7200
    },
    {
      name: 'Greater LA (non-rentable)',
      rule_id: '06a97976-180d-4990-b497-ecafbe818d7d',
      rule_type: 'time',
      rule_units: 'minutes',
      geographies: [GEOGRAPHY_UUID],
      states: { removed: [], on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 720
    }
  ]
}

// in the future
export const POLICY3_JSON: ModalityPolicy = {
  // TODO guts
  policy_id: POLICY3_UUID,
  name: 'MDSPolicy 3',
  description: 'LADOT Pilot Speed Limit Limitations From the Future',
  start_date: START_ONE_MONTH_FROM_NOW,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA',
      rule_id: 'bfd790d3-87d6-41ec-afa0-98fa443ee0d3',
      rule_type: 'speed',
      rule_units: 'mph',
      geographies: [GEOGRAPHY_UUID],
      states: { on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 15
    },
    {
      name: 'Venice Beach on weekend afternoons',
      geographies: [GEOGRAPHY2_UUID],
      rule_id: 'dff14dd1-603e-43d1-b0cf-5d4fe21d8628',
      rule_type: 'speed',
      rule_units: 'mph',
      states: { on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      days: ['sat', 'sun'],
      start_time: '12:00',
      end_time: '23:59',
      maximum: 10,
      messages: {
        'en-US': 'Remember to stay under 10 MPH on Venice Beach on weekends!',
        'es-US': '¡Recuerda permanecer menos de 10 millas por hora en Venice Beach los fines de semana!'
      }
    }
  ]
}

export const POLICY4_JSON: ModalityPolicy = {
  // TODO guts
  policy_id: POLICY4_UUID,
  name: 'MDSPolicy 4',
  description: 'LADOT Pilot Speed Limit Limitations',
  start_date: now(),
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA',
      rule_id: uuid(),
      rule_type: 'speed',
      rule_units: 'mph',
      geographies: [GEOGRAPHY_UUID],
      states: { on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 25
    }
  ]
}

export const POLICY5_JSON: ModalityPolicy = {
  policy_id: uuid(),
  name: 'MDSPolicy 5',
  description: 'just here to enable testing for policies by start date',
  start_date: START_ONE_MONTH_AGO,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA',
      rule_id: uuid(),
      rule_type: 'speed',
      rule_units: 'mph',
      geographies: [GEOGRAPHY_UUID],
      states: { on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 25
    }
  ]
}

export const PUBLISH_DATE_VALIDATION_JSON: ModalityPolicy = {
  policy_id: '682ab342-0127-4eed-8c26-fb674c25af74',
  name: 'Future MDSPolicy',
  description: 'just here to help show that publish_date must be before start_date',
  start_date: START_ONE_MONTH_AGO,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA',
      rule_id: uuid(),
      rule_type: 'speed',
      rule_units: 'mph',
      geographies: [GEOGRAPHY_UUID],
      states: { on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 25
    }
  ]
}

export const POLICY_JSON_MISSING_POLICY_ID = {
  name: 'I have no identity woe is me',
  description: 'LADOT Pilot Speed Limit Limitations',
  start_date: now(),
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA',
      rule_id: uuid(),
      rule_type: 'speed',
      rule_units: 'mph',
      geographies: [NONEXISTENT_GEOGRAPHY_UUID],
      states: { on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 25
    }
  ]
}

export const POLICY_WITH_DUPE_RULE: ModalityPolicy = {
  policy_id: 'ddb4fbc7-0f3d-49cf-869d-f9c1d0b5471f',
  name: 'I am a no good copycat',
  description: 'LADOT Pilot Speed Limit Limitations',
  start_date: now(),
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA',
      rule_id: 'bfd790d3-87d6-41ec-afa0-98fa443ee0d3',
      rule_type: 'speed',
      rule_units: 'mph',
      geographies: [NONEXISTENT_GEOGRAPHY_UUID],
      states: { on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 25
    }
  ]
}

export const PUBLISHED_POLICY: ModalityPolicy = {
  policy_id: 'a337afd5-f8a9-4291-b176-11f965bc9f3d',
  name: 'I am published but do not do much',
  description: 'LADOT Pilot Speed Limit Limitations',
  start_date: START_ONE_MONTH_AGO,
  publish_date: START_ONE_MONTH_AGO,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA',
      rule_id: uuid(),
      rule_type: 'speed',
      rule_units: 'mph',
      geographies: [GEOGRAPHY_UUID],
      states: { on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 25
    }
  ]
}

export const DELETEABLE_POLICY: ModalityPolicy = {
  policy_id: '55396abd-e32b-4370-ac02-7f3294eef49e',
  name: 'I am published but do not do much',
  description: 'LADOT Pilot Speed Limit Limitations',
  start_date: START_ONE_MONTH_AGO,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA',
      rule_id: uuid(),
      rule_type: 'speed',
      rule_units: 'mph',
      geographies: [GEOGRAPHY_UUID],
      states: { on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 25
    }
  ]
}

export const TAXI_POLICY: ModalityPolicy = {
  name: 'Policy 1',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: uuid(),
  start_date: START_TOMORROW,
  end_date: null,
  publish_date: START_NOW,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      rule_type: 'count',
      rule_id: uuid(),
      name: 'Greater LA',
      geographies: [GEOGRAPHY_UUID],
      modality: 'taxi',
      states: { available: [], removed: [], reserved: [], on_trip: [] },
      vehicle_types: ['car'],
      maximum: 3000,
      minimum: 500
    }
  ]
}
