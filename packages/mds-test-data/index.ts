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
  VEHICLE_EVENTS,
  PROPULSION_TYPE,
  VEHICLE_EVENT,
  VEHICLE_TYPES,
  PROPULSION_TYPES,
  UUID,
  Device,
  Timestamp,
  Telemetry,
  VehicleEvent,
  Policy,
  PROVIDER_EVENT,
  PROVIDER_REASON,
  PROVIDER_EVENTS,
  PROVIDER_REASONS
} from '@mds-core/mds-types'
import { Geometry } from 'geojson'
import { StatusChange, Trip } from '@mds-core/mds-db/types'

import {
  addDistanceBearing,
  days,
  makePointInShape,
  now,
  pointInShape,
  randomElement,
  range,
  rangeRandom,
  rangeRandomInt
} from '@mds-core/mds-utils'

import { serviceAreaMap } from 'ladot-service-areas'

import uuid4 from 'uuid'

import log from '@mds-core/mds-logger'

import {
  JUMP_PROVIDER_ID,
  LIME_PROVIDER_ID,
  BIRD_PROVIDER_ID,
  TEST1_PROVIDER_ID,
  TEST3_PROVIDER_ID,
  providerName
} from '@mds-core/mds-providers'

import { LA_CITY_BOUNDARY } from './la-city-boundary'
import { DISTRICT_SEVEN } from './district-seven'

const GEOGRAPHY_UUID = '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49'
const GEOGRAPHY2_UUID = '722b99ca-65c2-4ed6-9be1-056c394fadbf'
const NONEXISTENT_GEOGRAPHY_UUID = '991d4062-6e5e-4ac1-bcd1-1a3bd6d7f63c'

const POLICY_UUID = '72971a3d-876c-41ea-8e48-c9bb965bbbcc'
const POLICY2_UUID = '5681364c-2ebf-4ba2-9ca0-50f4be2a5876'
const POLICY3_UUID = '42d899b8-255d-4109-aa67-abfb9157b46a'
const POLICY4_UUID = 'de15243e-dfaa-4a88-b21a-db7cd2c3dc78'
const POLICY_JSON_MISSING_POLICY_ID_UUID = 'e5ddf6ec-8b45-42ec-a1b5-b72e24644e1c'
const SUPERSEDING_POLICY_UUID = 'd6371e73-6a8c-4b51-892f-78849d66ee2b'

const PROVIDER_SCOPES = 'admin:all'

// for test purposes
const PROVIDER_AUTH =
  'bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IlFVWkJRVFUwT0RJNE9EbERRakl3TWpJeE0wVkZNamhHTmtaRFFUa3lSRGRGTmtSRFF6RkZOUSJ9.eyJodHRwczovL2xhZG90LmlvL3Byb3ZpZGVyX2lkIjoiNWY3MTE0ZDEtNDA5MS00NmVlLWI0OTItZTU1ODc1ZjdkZTAwIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmxhZG90LmlvLyIsInN1YiI6IjE4UmN1QVJLQzVSUHQ5ZmFON0VRNXdjRTVvUmNlbzB0QGNsaWVudHMiLCJhdWQiOiJodHRwczovL3NhbmRib3gubGFkb3QuaW8iLCJpYXQiOjE1NTMzMTAyNDYsImV4cCI6MTU1NDM5MDI0NiwiYXpwIjoiMThSY3VBUktDNVJQdDlmYU43RVE1d2NFNW9SY2VvMHQiLCJzY29wZSI6ImFkbWluOmFsbCB0ZXN0OmFsbCIsImd0eSI6ImNsaWVudC1jcmVkZW50aWFscyJ9.NNTJpeVAvbyslzK0PLrDkPs6_rGQ7tZwVl00QlNiDPUPuMzlCcMWTCOei0Jwm9_21KXAsGo6iko1oYgutrMPjvnePCDFbs3h2iGX8Wiw4rx0FrOijNJV6GWXSW33okagoABo0b63mLnGpfZYRNVjAbMEcJ5GrAWbEvZZeSIL6Mjl6YYn527mU4eWyqRMwTDtJ0s8iYaT2fj3VyOYZcUy0wCeQ3otK2ikkW4jyFgL60-Bb0U6IVh1rHPlS4pZa-wDzg1Pjk9I0RaBWDJQzpTd7OsEMwq-4qMqi9xrzQ6f52Sdl3JbKcQ0EzKK4GHGdILRiUfIpfZLEnNBOH9iAsOswQ'

const COMPLIANCE_AUTH =
  'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGgubGFkb3QuaW8vIiwic3ViIjoiMThSY3VBUktDNVJQdDlmYU43RVE1d2NFNW9SY2VvMHRAY2xpZW50cyIsImF1ZCI6Imh0dHBzOi8vc2FuZGJveC5sYWRvdC5pbyIsImlhdCI6MTU1MzMxMDI0NiwiZXhwIjoxNTU0MzkwMjQ2LCJhenAiOiIxOFJjdUFSS0M1UlB0OWZhTjdFUTV3Y0U1b1JjZW8wdCIsInNjb3BlIjoiYWRtaW46YWxsIHRlc3Q6YWxsIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.a17IoARIRcGD1f3RIwRbw8KYIFN6IcF70DWrGkzKUNY'

const BAD_PROVIDER_UUID = '5f7114d1-4091-46ee-b492-e55875f7de99'

const JUMP_TEST_DEVICE_1: Device = {
  provider_id: JUMP_PROVIDER_ID,
  device_id: 'e9edbe74-f7be-48e0-a63a-92f4bc1af5ed',
  vehicle_id: '1230987',
  type: VEHICLE_TYPES.scooter,
  propulsion: [PROPULSION_TYPES.electric],
  year: 2018,
  mfgr: 'Schwinn',
  model: 'whoknows',
  recorded: now()
}

const START_YESTERDAY = now() - (now() % days(1))

const POLICY_JSON: Policy = {
  // TODO guts
  name: 'Policy 1',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: POLICY_UUID,
  start_date: START_YESTERDAY,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: [
    {
      rule_type: 'count',
      rule_id: '7ea0d16e-ad15-4337-9722-9924e3af9146',
      name: 'Greater LA',
      geographies: [GEOGRAPHY_UUID],
      statuses: { available: [], unavailable: [], reserved: [], trip: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      maximum: 3000,
      minimum: 500
    }
  ]
}

const SUPERSEDING_POLICY_JSON: Policy = {
  // TODO guts
  name: 'Supersedes Policy 1',
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
      statuses: { available: [], unavailable: [], reserved: [], trip: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      maximum: 1000,
      minimum: 500
    }
  ]
}

const START_ONE_MONTH_AGO = now() - (now() % days(1)) - days(30)
const START_ONE_WEEK_AGO = now() - (now() % days(1)) - days(7)

// in the past
const POLICY2_JSON: Policy = {
  // TODO guts
  name: 'Policy 2',
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
      statuses: { available: [], reserved: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      maximum: 7200
    },
    {
      name: 'Greater LA (non-rentable)',
      rule_id: '06a97976-180d-4990-b497-ecafbe818d7d',
      rule_type: 'time',
      rule_units: 'minutes',
      geographies: [GEOGRAPHY_UUID],
      statuses: { unavailable: [], trip: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      maximum: 720
    }
  ]
}

const START_ONE_MONTH_FROM_NOW = now() - (now() % days(1)) + days(30)

// in the future
const POLICY3_JSON: Policy = {
  // TODO guts
  policy_id: POLICY3_UUID,
  name: 'Policy 3',
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
      statuses: { trip: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      maximum: 15
    },
    {
      name: 'Venice Beach on weekend afternoons',
      geographies: [GEOGRAPHY2_UUID],
      rule_id: 'dff14dd1-603e-43d1-b0cf-5d4fe21d8628',
      rule_type: 'speed',
      rule_units: 'mph',
      statuses: { trip: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
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

const POLICY4_JSON: Policy = {
  // TODO guts
  policy_id: POLICY4_UUID,
  name: 'Policy 4',
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
      geographies: [GEOGRAPHY_UUID],
      statuses: { trip: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      maximum: 25
    }
  ]
}

const POLICY_JSON_MISSING_POLICY_ID = {
  name: 'I have no identity woe is me',
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
      statuses: { trip: [] },
      vehicle_types: [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter],
      maximum: 25
    }
  ]
}

function makeTelemetry(devices: Device[], timestamp: Timestamp): Telemetry[] {
  let i = 0
  const serviceAreaKeys = Object.keys(serviceAreaMap)

  const num_areas = 1
  const cluster_info: {
    [key: string]: { num_clusters: number; cluster_radii: number[]; cluster_centers: { lat: number; lng: number }[] }
  } = {}

  log.info('clustering')
  serviceAreaKeys.slice(0, 1).map(key => {
    const serviceArea = serviceAreaMap[key]
    const serviceAreaMultipoly = serviceArea.area
    cluster_info[key] = {
      num_clusters: rangeRandomInt(5, 15), // number of clusters
      cluster_radii: [], // meters
      cluster_centers: [] // to be filled in
    }
    for (let j = 0; j < cluster_info[key].num_clusters; j++) {
      // make centers-of-gravity
      cluster_info[key].cluster_radii.push(rangeRandom(100, 1000))
      const center = makePointInShape(serviceAreaMultipoly)
      if (!pointInShape(center, serviceAreaMultipoly)) {
        throw new Error('bad center is not in multipoly (1)')
      }
      cluster_info[key].cluster_centers.push(center)
    }
  })

  const telemetries = devices.map(device => {
    // make a rando telemetry for that vehicle, in one of the areas
    const key = serviceAreaKeys[i++ % num_areas]
    const serviceArea = serviceAreaMap[key]
    const service_area_multipoly = serviceArea.area

    // pick a cluster
    const { num_clusters } = cluster_info[key]
    const cluster_num = rangeRandomInt(num_clusters)
    // get the center and radius of the cluster, then put a vehicle in there
    let point
    let tries = 0
    for (;;) {
      const center = cluster_info[key].cluster_centers[cluster_num]
      if (!pointInShape(center, service_area_multipoly)) {
        throw new Error('bad center is not in multipoly (2)')
      }
      const radius = cluster_info[key].cluster_radii[cluster_num]
      const angle = rangeRandomInt(360)
      point = addDistanceBearing(center, rangeRandom(0, radius), angle)
      if (pointInShape(point, service_area_multipoly)) {
        break
      }
      if (tries++ > 100) {
        throw new Error('unable to create point in polygon after 100 tries')
      }
    }
    return {
      device_id: device.device_id,
      provider_id: device.provider_id,
      gps: {
        lat: point.lat,
        lng: point.lng,
        speed: rangeRandomInt(0, 10),
        hdop: rangeRandomInt(0, 5),
        heading: rangeRandomInt(0, 360)
      },
      charge: rangeRandom(0.1, 0.9),
      timestamp,
      recorded: now()
    }
  })

  return telemetries
}

function makeTelemetryInShape(device: Device, timestamp: number, shape: Geometry, speed: number) {
  const point = makePointInShape(shape)
  return {
    device_id: device.device_id,
    provider_id: device.provider_id,
    gps: {
      lat: point.lat,
      lng: point.lng,
      speed,
      hdop: rangeRandomInt(0, 5),
      heading: rangeRandomInt(0, 360)
    },
    charge: rangeRandom(0.1, 0.9),
    timestamp,
    recorded: timestamp
  }
}

function makeTelemetryInArea(device: Device, timestamp: Timestamp, area: UUID | Geometry, speed: number) {
  if (typeof area === 'string') {
    const serviceArea = serviceAreaMap[area]
    return makeTelemetryInShape(device, timestamp, serviceArea.area, speed)
  }
  return makeTelemetryInShape(device, timestamp, area, speed)
}

function makeTelemetryStream(origin: Telemetry, steps: number) {
  if (!origin.provider_id) {
    throw new Error('makeTelemetryStream requires non-null provider_id')
  }
  if (typeof origin.gps !== 'object') {
    throw new Error(`invalid origin gps ${origin.gps}`)
  }
  if (typeof origin.gps.heading !== 'number' || origin.gps.heading === null || origin.gps.heading === undefined) {
    throw new Error(`invalid origin heading "${origin.gps.heading}"`)
  }

  const stream: Telemetry[] = []
  let t = { ...origin } as Telemetry & { gps: { heading: number } }
  Object.assign(t.gps, origin.gps)
  range(steps).map(() => {
    t = { ...t }
    // move 50m in whatever the bearing is
    t.gps = addDistanceBearing(t.gps, 50, t.gps.heading)
    // turn 5º
    t.gps.heading += 5
    t.timestamp += 5000 // 5 sec
    stream.push(t)
  })
  return stream
}

function makeEvents(devices: Device[], timestamp: Timestamp, event_type = VEHICLE_EVENTS.deregister): VehicleEvent[] {
  if (!event_type) {
    throw new Error('empty event_type')
  }

  return devices.map(device => {
    return {
      device_id: device.device_id,
      provider_id: device.provider_id,
      event_type: event_type as VEHICLE_EVENT,
      timestamp,
      recorded: now()
    }
  })
}

function makeEventsWithTelemetry(
  devices: Device[],
  timestamp: Timestamp,
  area: UUID | Geometry,
  event_type: null | string = null,
  speed = rangeRandomInt(10)
): VehicleEvent[] {
  return devices.map(device => {
    const vehicleEventsKeys = Object.keys(VEHICLE_EVENTS)
    return {
      device_id: device.device_id,
      provider_id: device.provider_id,
      event_type: event_type
        ? (event_type as VEHICLE_EVENT)
        : (vehicleEventsKeys[rangeRandomInt(vehicleEventsKeys.length)] as VEHICLE_EVENT),
      telemetry: makeTelemetryInArea(device, timestamp, area, speed),
      timestamp,
      recorded: timestamp
    }
  })
}

function makeDevices(count: number, timestamp: Timestamp, provider_id = TEST1_PROVIDER_ID): Device[] {
  // make N devices, distributed across the regions
  const devices = []
  for (let i = 0; i < count; i += 1) {
    // make a rando vehicle
    const device_id = uuid4()
    const coin = rangeRandomInt(2)
    let type
    let propulsion: PROPULSION_TYPE[]
    switch (provider_id) {
      case LIME_PROVIDER_ID:
      case JUMP_PROVIDER_ID:
        type = [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter][coin]
        if (type === VEHICLE_TYPES.bicycle) {
          propulsion = [[PROPULSION_TYPES.human, PROPULSION_TYPES.electric], [PROPULSION_TYPES.human]][
            coin
          ] as PROPULSION_TYPE[]
        } else {
          propulsion = [PROPULSION_TYPES.electric]
        }
        break
      case BIRD_PROVIDER_ID:
        type = VEHICLE_TYPES.scooter
        propulsion = [PROPULSION_TYPES.electric]
        break
      default:
        type = VEHICLE_TYPES.bicycle
        propulsion = [PROPULSION_TYPES.human]
        break
    }
    let mfgr
    let model
    const year = rangeRandomInt(2016, 2020)
    switch (type) {
      case VEHICLE_TYPES.scooter:
        mfgr = 'Xiaomi'
        model = 'M365'
        break
      case VEHICLE_TYPES.bicycle:
        mfgr = 'Schwinn'
        model = 'Mantaray'
        break
      default:
        throw new Error(`unknown type: ${type}`)
    }
    const device = {
      device_id,
      provider_id,
      vehicle_id: `test-vin-${Math.round(Math.random() * 1000000)}`,
      type,
      propulsion,
      year,
      mfgr,
      model,
      timestamp,
      recorded: now()
    }
    devices.push(device)
  }
  return devices
}

function makeStatusChange(device: Device, timestamp: Timestamp): StatusChange {
  const event_type = randomElement(Object.keys(PROVIDER_EVENTS) as PROVIDER_EVENT[])
  const event_type_reason = randomElement(Object.keys(PROVIDER_REASONS) as PROVIDER_REASON[])

  return {
    provider_id: device.provider_id,
    provider_name: providerName(device.provider_id),
    device_id: device.device_id,
    vehicle_id: device.vehicle_id,
    event_type,
    event_type_reason,
    event_location: null,
    battery_pct: rangeRandomInt(1, 100),
    associated_trip: uuid4(),
    event_time: timestamp,
    vehicle_type: device.type,
    propulsion_type: device.propulsion,
    recorded: now()
  }
}

function makeTrip(device: Device): Trip {
  return {
    provider_id: device.provider_id,
    provider_name: providerName(device.provider_id),
    device_id: device.device_id,
    vehicle_id: device.vehicle_id,
    vehicle_type: device.type,
    propulsion_type: device.propulsion,
    provider_trip_id: uuid4(),
    trip_duration: rangeRandomInt(5),
    trip_distance: rangeRandomInt(5),
    route: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            timestamp: now()
          },
          geometry: {
            type: 'Point',
            coordinates: [Math.random() * 10, Math.random() * 10]
          }
        }
      ]
    },
    accuracy: Math.random() * 3,
    trip_start: now() - 1000 * Math.random(),
    trip_end: now(),
    parking_verification_url: 'http://iamverified.com',
    standard_cost: rangeRandomInt(5),
    actual_cost: rangeRandomInt(5),
    recorded: now()
  }
}

export {
  BAD_PROVIDER_UUID,
  TEST3_PROVIDER_ID as PROVIDER_UUID,
  PROVIDER_AUTH,
  COMPLIANCE_AUTH,
  JUMP_TEST_DEVICE_1,
  JUMP_PROVIDER_ID,
  POLICY_JSON,
  SUPERSEDING_POLICY_JSON,
  POLICY2_JSON,
  POLICY3_JSON,
  POLICY4_JSON,
  POLICY_JSON_MISSING_POLICY_ID,
  POLICY_UUID,
  SUPERSEDING_POLICY_UUID,
  POLICY2_UUID,
  POLICY3_UUID,
  GEOGRAPHY_UUID,
  GEOGRAPHY2_UUID,
  START_ONE_MONTH_AGO,
  START_ONE_WEEK_AGO,
  PROVIDER_SCOPES,
  LA_CITY_BOUNDARY,
  DISTRICT_SEVEN,
  makeDevices,
  makeEvents,
  makeEventsWithTelemetry,
  makeTelemetry,
  makeTelemetryInArea,
  makeTelemetryInShape,
  makeTelemetryStream,
  makeStatusChange,
  makeTrip
}
