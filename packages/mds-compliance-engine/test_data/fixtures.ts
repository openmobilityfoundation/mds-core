import { Polygon } from 'geojson'
import { veniceSpecOps, LA_CITY_BOUNDARY, restrictedAreas } from '@mds-core/mds-test-data'

import { Geography, ModalityCountPolicy, ModalityPolicy, ModalitySpeedPolicy, RULE_TYPES } from '@mds-core/mds-types'
import { days, now } from '@mds-core/mds-utils'

export const CITY_OF_LA = '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'
export const LA_GEOGRAPHY = { name: 'la', geography_id: CITY_OF_LA, geography_json: LA_CITY_BOUNDARY }
export const LA_BEACH = 'ff822e26-a70c-4721-ac32-2f6734beff9b'
export const LA_BEACH_GEOGRAPHY = { name: 'la beach', geography_id: LA_BEACH, geography_json: restrictedAreas }
export const RESTRICTED_GEOGRAPHY = {
  name: 'la',
  geography_id: 'c0591267-bb6a-4f28-a612-ff7f4a8f8b2a',
  geography_json: restrictedAreas
}

export const COUNT_POLICY_UUID = '72971a3d-876c-41ea-8e48-c9bb965bbbcc'
export const COUNT_POLICY_UUID_2 = '37637f96-2580-475a-89e7-cfc5d2e70f84'
export const COUNT_POLICY_UUID_3 = 'e8f9a720-6c12-41c8-a31c-715e76d65ea1'
export const COUNT_POLICY_JSON: ModalityCountPolicy = {
  name: 'LADOT Mobility Caps',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: COUNT_POLICY_UUID,
  start_date: 1558389669540,
  publish_date: 1558389669540,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA',
      rule_id: '47c8c7d4-14b5-43a3-b9a5-a32ecc2fb2c6',
      rule_type: RULE_TYPES.count,
      geographies: [CITY_OF_LA],
      states: { available: [], non_operational: [], reserved: [], on_trip: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 10,
      minimum: 5
    }
  ]
}

export const COUNT_POLICY_JSON_2: ModalityCountPolicy = {
  name: 'Something Mobility Caps',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: COUNT_POLICY_UUID_2,
  start_date: 1558389669540,
  end_date: null,
  publish_date: 1558389669540,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'No vehicles permitted on Venice Beach on weekends',
      rule_id: '405b959e-4377-4a31-8b34-a9a4771125fc',
      rule_type: RULE_TYPES.count,
      geographies: ['ff822e26-a70c-4721-ac32-2f6734beff9b'],
      states: { available: [], non_operational: [], reserved: [], on_trip: [] },
      days: ['sat', 'sun'],
      maximum: 0,
      minimum: 0
    }
  ]
}

export const COUNT_POLICY_JSON_3: ModalityCountPolicy = {
  name: 'LADOT Mobility Caps',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: COUNT_POLICY_UUID_3,
  start_date: 1558389669540,
  publish_date: 1558389669540,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Greater LA',
      rule_id: '04dc545b-41d8-401d-89bd-bfac9247b555',
      rule_type: RULE_TYPES.count,
      geographies: [CITY_OF_LA],
      states: { available: ['on_hours'], non_operational: [], reserved: [] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 10
    }
  ]
}

export const COUNT_POLICY_JSON_5: ModalityCountPolicy = {
  name: 'Prohibited Dockless Zones',
  rules: [
    {
      name: 'Prohibited Dockless Zones',
      maximum: 0,
      rule_id: '8ad39dc3-005b-4348-9d61-c830c54c161b',
      states: {
        on_trip: [],
        reserved: [],
        available: []
      },
      rule_type: 'count',
      geographies: ['c0591267-bb6a-4f28-a612-ff7f4a8f8b2a'],
      vehicle_types: ['bicycle', 'scooter']
    }
  ],
  end_date: null,
  policy_id: '25851571-b53f-4426-a033-f375be0e7957',
  start_date: Date.now(),
  publish_date: Date.now() - 10,
  description:
    'Prohibited areas for dockless vehicles within the City of Los Angeles for the LADOT Dockless On-Demand Personal Mobility Program',
  prev_policies: null
}

export const VENICE_POLICY_UUID = 'dd9ace3e-14c8-461b-b5e7-1326505ff176'

// A geo contained within Venice Beach
export const INNER_GEO: Geography = {
  name: 'inner venice geo',
  geography_id: 'b4c75556-3842-47a9-b8f6-d721b98c8ca5',
  geography_json: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-118.46941709518433, 33.9807517760146],
              [-118.46564054489136, 33.9807517760146],
              [-118.46564054489136, 33.98356306245639],
              [-118.46941709518433, 33.98356306245639],
              [-118.46941709518433, 33.9807517760146]
            ]
          ]
        }
      }
    ]
  }
}

// This geo is all of Venice Beach.
export const OUTER_GEO: Geography = {
  geography_id: 'e0e4a085-7a50-43e0-afa4-6792ca897c5a',
  name: 'outer venice geo',
  geography_json: {
    type: 'FeatureCollection',
    features: [{ properties: {}, type: 'Feature', geometry: veniceSpecOps.features[0].geometry }]
  }
}

// This is another geo contained within Venice Beach, near the canals.
// It is contained within INNER_GEO.
export const INNER_POLYGON: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-118.46853733062744, 33.98187274314647],
      [-118.46694946289064, 33.98187274314647],
      [-118.46694946289064, 33.982797974722246],
      [-118.46853733062744, 33.982797974722246],
      [-118.46853733062744, 33.98187274314647]
    ]
  ]
}

// This geo is a subset of Venice Beach, near the elementary school.
export const INNER_POLYGON_2: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-118.47261428833006, 33.98888290068113],
      [-118.4684944152832, 33.98888290068113],
      [-118.4684944152832, 33.99044854215088],
      [-118.47261428833006, 33.99044854215088],
      [-118.47261428833006, 33.98888290068113]
    ]
  ]
}

export const TANZANIA_POLYGON: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-322.80029296875, -7.406047717076258],
      [-323.0859375, -8.363692651835823],
      [-322.36083984375, -8.624472107633936],
      [-320.77880859375, -8.276727101164033],
      [-321.8115234375, -7.209900314368781],
      [-322.80029296875, -7.406047717076258]
    ]
  ]
}

export const TANZANIA_GEO: Geography = {
  geography_id: '122de6e9-a008-4602-a8b9-9ded3efa3580',
  name: 'Tanzania geo',
  geography_json: {
    type: 'FeatureCollection',
    features: [
      {
        properties: {},
        type: 'Feature',
        geometry: TANZANIA_POLYGON
      }
    ]
  }
}

export const HIGH_COUNT_POLICY: ModalityCountPolicy = {
  policy_id: '221975ef-569c-40a1-a9b0-646e6155c764',
  name: 'LADOT Pilot Caps',
  description: 'LADOT Pilot Caps (add description)',
  start_date: 1552678594428,
  end_date: null,
  prev_policies: null,
  rules: [
    {
      name: 'Greater LA',
      rule_id: '47c8c7d4-14b5-43a3-b9a5-a32ecc2fb2c6',
      rule_type: 'count',
      geographies: ['1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'],
      states: {
        available: [],
        on_trip: []
      },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 3000,
      minimum: 500
    }
  ]
}

export const LOW_COUNT_POLICY: ModalityCountPolicy = {
  policy_id: '6d7a9c7e-853c-4ff7-a86f-e17c06d3bd80',
  name: 'Very Low Count Limit',
  description: 'Very low count limit',
  start_date: 1552678594428,
  end_date: null,
  prev_policies: null,
  rules: [
    {
      name: 'Greater LA',
      rule_id: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
      rule_type: 'count',
      geographies: ['1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'],
      states: {
        on_trip: []
      },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 5
    }
  ]
}

export const EXPIRED_POLICY: ModalityCountPolicy = {
  policy_id: '6d7a9c7e-853c-4ff7-a86f-e17c06d3bd80',
  name: 'i expired',
  description: 'expired',
  start_date: now() - days(7),
  end_date: now() - days(1),
  prev_policies: null,
  rules: [
    {
      name: 'Greater LA',
      rule_id: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
      rule_type: 'count',
      geographies: ['1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'],
      states: {
        on_trip: []
      },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 5
    }
  ]
}

export const VENICE_OVERFLOW_POLICY: ModalityCountPolicy = {
  name: 'Venice Overflow Test',
  description: 'what it says on the can',
  policy_id: VENICE_POLICY_UUID,
  start_date: 1558389669540,
  publish_date: 1558389669540,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Inner geo',
      rule_id: '7a043ac8-03cd-4b0d-9588-d0af24f82832',
      rule_type: RULE_TYPES.count,
      geographies: [INNER_GEO.geography_id],
      states: { available: ['provider_drop_off'] },
      maximum: 1,
      vehicle_types: ['bicycle', 'scooter']
    },
    {
      name: 'Outer Zone',
      rule_id: '596d7fe1-53fd-4ea4-8ba7-33f5ea8d98a6',
      rule_type: RULE_TYPES.count,
      geographies: [OUTER_GEO.geography_id],
      states: { available: ['provider_drop_off'] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 2
    }
  ]
}

export const VENICE_MIXED_VIOLATIONS_POLICY: ModalityCountPolicy = {
  name: 'Venice Overflow Test',
  description: 'what it says on the can',
  policy_id: VENICE_POLICY_UUID,
  start_date: 1558389669540,
  publish_date: 1558389669540,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Inner geo',
      rule_id: '7a043ac8-03cd-4b0d-9588-d0af24f82832',
      rule_type: RULE_TYPES.count,
      geographies: [INNER_GEO.geography_id],
      states: { available: ['provider_drop_off'] },
      maximum: 1,
      vehicle_types: ['bicycle', 'scooter']
    },
    {
      name: 'Outer Zone',
      rule_id: '596d7fe1-53fd-4ea4-8ba7-33f5ea8d98a6',
      rule_type: RULE_TYPES.count,
      geographies: [OUTER_GEO.geography_id],
      states: { available: ['provider_drop_off'] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 1000,
      minimum: 10
    }
  ]
}

export const MANY_OVERFLOWS_POLICY: ModalityCountPolicy = {
  name: 'Many overflows',
  description: 'what it says on the can',
  policy_id: VENICE_POLICY_UUID,
  start_date: 1558389669540,
  publish_date: 1558389669540,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Somewhere in LA',
      rule_id: '7a043ac8-03cd-4b0d-9588-d0af24f82832',
      rule_type: RULE_TYPES.count,
      geographies: [INNER_GEO.geography_id],
      states: { available: ['provider_drop_off'] },
      maximum: 1,
      vehicle_types: ['bicycle', 'scooter']
    },
    {
      name: 'Somewhere in Tanzania',
      rule_id: '596d7fe1-53fd-4ea4-8ba7-33f5ea8d98a6',
      rule_type: RULE_TYPES.count,
      geographies: [TANZANIA_GEO.geography_id],
      states: { available: ['provider_drop_off'] },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 5,
      minimum: 1
    }
  ]
}

export const TEST_ZONE_NO_VALID_DROP_OFF_POINTS: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-118.46941709518433, 33.9807517760146],
      [-118.46564054489136, 33.9807517760146],
      [-118.46564054489136, 33.98356306245639],
      [-118.46941709518433, 33.98356306245639],
      [-118.46941709518433, 33.9807517760146]
    ]
  ]
}

export const OVERLAPPING_GEOS_SPEED_POLICY: ModalitySpeedPolicy = {
  policy_id: 'fc9b02f0-9c0d-4b0a-85d6-7684b8e9e769',
  name: 'Multiple Speed Limits',
  description: 'LADOT Pilot Speed Limit Limitations',
  start_date: 1552678594428,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'Slow Zone in Venice Beach',
      rule_id: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
      rule_type: 'speed',
      rule_units: 'mph',
      geographies: [INNER_GEO.geography_id],
      states: {
        on_trip: []
      },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 10
    },
    {
      name: 'Venice Beach',
      rule_id: '178b570d-e0ba-41d5-a9a9-e8a91440c0e8',
      rule_type: 'speed',
      rule_units: 'mph',
      geographies: [OUTER_GEO.geography_id],
      states: {
        on_trip: []
      },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 25
    }
  ]
}

export const OVERLAPPING_GEOS_TIME_POLICY: ModalityPolicy = {
  policy_id: 'fc9b02f0-9c0d-4b0a-85d6-7684b8e9e769',
  name: 'Multiple Speed Limits',
  description: 'LADOT Pilot Speed Limit Limitations',
  start_date: 1552678594428,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      name: 'No Drop-Off Zone in Venice',
      rule_id: '2aa6953d-fa8f-4018-9b54-84c8b4b83c6d',
      rule_type: 'time',
      rule_units: 'minutes',
      geographies: [INNER_GEO.geography_id],
      states: {
        available: []
      },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 0
    },
    {
      name: 'Venice Beach',
      rule_id: '178b570d-e0ba-41d5-a9a9-e8a91440c0e8',
      rule_type: 'time',
      rule_units: 'minutes',
      geographies: [OUTER_GEO.geography_id],
      states: {
        available: []
      },
      vehicle_types: ['bicycle', 'scooter'],
      maximum: 25
    }
  ]
}
