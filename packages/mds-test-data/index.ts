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
  PROPULSION_TYPE,
  VEHICLE_EVENT,
  VEHICLE_TYPES,
  PROPULSION_TYPES,
  UUID,
  Device,
  Timestamp,
  Telemetry,
  VehicleEvent,
  VEHICLE_STATE,
  MODALITY
} from '@mds-core/mds-types'
import { Geometry } from 'geojson'

import {
  addDistanceBearing,
  makePointInShape,
  now,
  pointInShape,
  range,
  rangeRandom,
  rangeRandomInt,
  uuid
} from '@mds-core/mds-utils'

import logger from '@mds-core/mds-logger'

import { JUMP_PROVIDER_ID, LIME_PROVIDER_ID, BIRD_PROVIDER_ID, TEST1_PROVIDER_ID } from '@mds-core/mds-providers'
import { serviceAreaMap, restrictedAreas, veniceSpecOps } from './test-areas/test-areas'

import {
  POLICY_JSON,
  TAXI_POLICY,
  SUPERSEDING_POLICY_JSON,
  POLICY2_JSON,
  POLICY3_JSON,
  POLICY4_JSON,
  POLICY5_JSON,
  POLICY_JSON_MISSING_POLICY_ID,
  POLICY_WITH_DUPE_RULE,
  PUBLISH_DATE_VALIDATION_JSON,
  POLICY_UUID,
  PUBLISHED_POLICY,
  DELETEABLE_POLICY,
  SUPERSEDING_POLICY_UUID,
  POLICY2_UUID,
  POLICY3_UUID,
  POLICY4_UUID,
  GEOGRAPHY_UUID,
  GEOGRAPHY2_UUID,
  NONEXISTENT_GEOGRAPHY_UUID,
  START_ONE_MONTH_AGO,
  START_ONE_WEEK_AGO,
  START_ONE_MONTH_FROM_NOW
} from './policies'
import { LA_CITY_BOUNDARY } from './test-areas/la-city-boundary'
import { DISTRICT_SEVEN } from './test-areas/district-seven'

const PROVIDER_SCOPES = 'admin:all'

// for test purposes
const PROVIDER_AUTH =
  'bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IlFVWkJRVFUwT0RJNE9EbERRakl3TWpJeE0wVkZNamhHTmtaRFFUa3lSRGRGTmtSRFF6RkZOUSJ9.eyJodHRwczovL2xhZG90LmlvL3Byb3ZpZGVyX2lkIjoiNWY3MTE0ZDEtNDA5MS00NmVlLWI0OTItZTU1ODc1ZjdkZTAwIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmxhZG90LmlvLyIsInN1YiI6IjE4UmN1QVJLQzVSUHQ5ZmFON0VRNXdjRTVvUmNlbzB0QGNsaWVudHMiLCJhdWQiOiJodHRwczovL3NhbmRib3gubGFkb3QuaW8iLCJpYXQiOjE1NTMzMTAyNDYsImV4cCI6MTU1NDM5MDI0NiwiYXpwIjoiMThSY3VBUktDNVJQdDlmYU43RVE1d2NFNW9SY2VvMHQiLCJzY29wZSI6ImFkbWluOmFsbCB0ZXN0OmFsbCIsImd0eSI6ImNsaWVudC1jcmVkZW50aWFscyJ9.NNTJpeVAvbyslzK0PLrDkPs6_rGQ7tZwVl00QlNiDPUPuMzlCcMWTCOei0Jwm9_21KXAsGo6iko1oYgutrMPjvnePCDFbs3h2iGX8Wiw4rx0FrOijNJV6GWXSW33okagoABo0b63mLnGpfZYRNVjAbMEcJ5GrAWbEvZZeSIL6Mjl6YYn527mU4eWyqRMwTDtJ0s8iYaT2fj3VyOYZcUy0wCeQ3otK2ikkW4jyFgL60-Bb0U6IVh1rHPlS4pZa-wDzg1Pjk9I0RaBWDJQzpTd7OsEMwq-4qMqi9xrzQ6f52Sdl3JbKcQ0EzKK4GHGdILRiUfIpfZLEnNBOH9iAsOswQ'

const COMPLIANCE_AUTH =
  'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGgubGFkb3QuaW8vIiwic3ViIjoiMThSY3VBUktDNVJQdDlmYU43RVE1d2NFNW9SY2VvMHRAY2xpZW50cyIsImF1ZCI6Imh0dHBzOi8vc2FuZGJveC5sYWRvdC5pbyIsImlhdCI6MTU1MzMxMDI0NiwiZXhwIjoxNTU0MzkwMjQ2LCJhenAiOiIxOFJjdUFSS0M1UlB0OWZhTjdFUTV3Y0U1b1JjZW8wdCIsInNjb3BlIjoiYWRtaW46YWxsIHRlc3Q6YWxsIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.a17IoARIRcGD1f3RIwRbw8KYIFN6IcF70DWrGkzKUNY'

const BAD_PROVIDER_UUID = '5f7114d1-4091-46ee-b492-e55875f7de99'

const JUMP_TEST_DEVICE_1: Device = {
  accessibility_options: [],
  provider_id: JUMP_PROVIDER_ID,
  device_id: 'e9edbe74-f7be-48e0-a63a-92f4bc1af5ed',
  vehicle_id: '1230987',
  vehicle_type: VEHICLE_TYPES.scooter,
  propulsion_types: [PROPULSION_TYPES.electric],
  year: 2018,
  mfgr: 'Schwinn',
  modality: 'micromobility',
  model: 'whoknows',
  recorded: now()
}

function makeTelemetry(devices: Device[], timestamp: Timestamp): Telemetry[] {
  let i = 0
  const serviceAreaKeys = Object.keys(serviceAreaMap)

  const num_areas = 1
  const cluster_info: {
    [key: string]: { num_clusters: number; cluster_radii: number[]; cluster_centers: { lat: number; lng: number }[] }
  } = {}

  logger.info('clustering')
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

function makeEvents(
  devices: Device[],
  timestamp: Timestamp,
  makeEventsOptions: {
    event_types: VEHICLE_EVENT[]
    vehicle_state: VEHICLE_STATE
  } = { event_types: ['trip_start'], vehicle_state: 'on_trip' }
): VehicleEvent[] {
  const { event_types, vehicle_state } = makeEventsOptions

  return devices.map(device => {
    return {
      device_id: device.device_id,
      provider_id: device.provider_id,
      event_types,
      vehicle_state,
      trip_state: null,
      timestamp,
      recorded: now()
    }
  })
}

function makeEventsWithTelemetry(
  devices: Device[],
  timestamp: Timestamp,
  area: UUID | Geometry,
  makeEventsWithTelemetryOptions: {
    event_types: VEHICLE_EVENT[]
    vehicle_state: VEHICLE_STATE
    speed: number
    trip_id?: UUID
  } = {
    event_types: ['trip_start'],
    vehicle_state: 'on_trip',
    speed: rangeRandomInt(10)
  }
): VehicleEvent[] {
  const { event_types, vehicle_state, speed, trip_id } = makeEventsWithTelemetryOptions

  return devices.map(device => {
    return {
      device_id: device.device_id,
      provider_id: device.provider_id,
      event_types,
      vehicle_state,
      trip_state: null,
      telemetry: makeTelemetryInArea(device, timestamp, area, speed),
      timestamp,
      recorded: timestamp,
      trip_id
    }
  })
}

function makeDevices(count: number, timestamp: Timestamp, provider_id = TEST1_PROVIDER_ID): Device[] {
  // make N devices, distributed across the regions
  const devices = []
  for (let i = 0; i < count; i += 1) {
    // make a rando vehicle
    const device_id = uuid()
    const coin = rangeRandomInt(2)
    let vehicle_type
    let propulsion_types: PROPULSION_TYPE[]
    switch (provider_id) {
      case LIME_PROVIDER_ID:
      case JUMP_PROVIDER_ID:
        vehicle_type = [VEHICLE_TYPES.bicycle, VEHICLE_TYPES.scooter][coin]
        if (vehicle_type === VEHICLE_TYPES.bicycle) {
          propulsion_types = [[PROPULSION_TYPES.human, PROPULSION_TYPES.electric], [PROPULSION_TYPES.human]][
            coin
          ] as PROPULSION_TYPE[]
        } else {
          propulsion_types = [PROPULSION_TYPES.electric]
        }
        break
      case BIRD_PROVIDER_ID:
        vehicle_type = VEHICLE_TYPES.scooter
        propulsion_types = [PROPULSION_TYPES.electric]
        break
      default:
        vehicle_type = VEHICLE_TYPES.bicycle
        propulsion_types = [PROPULSION_TYPES.human]
        break
    }
    let mfgr
    let model
    const year = rangeRandomInt(2016, 2020)
    switch (vehicle_type) {
      case VEHICLE_TYPES.scooter:
        mfgr = 'Xiaomi'
        model = 'M365'
        break
      case VEHICLE_TYPES.bicycle:
        mfgr = 'Schwinn'
        model = 'Mantaray'
        break
      default:
        throw new Error(`unknown type: ${vehicle_type}`)
    }
    const device = {
      accessibility_options: [],
      device_id,
      provider_id,
      vehicle_id: `test-vin-${Math.round(Math.random() * 1000000)}`,
      vehicle_type,
      propulsion_types,
      year,
      mfgr,
      modality: 'micromobility' as MODALITY,
      model,
      timestamp,
      recorded: now()
    }
    devices.push(device)
  }
  return devices
}

const SCOPED_AUTH = <AccessTokenScope extends string>(scopes: AccessTokenScope[], principalId = TEST1_PROVIDER_ID) =>
  `basic ${Buffer.from(`${principalId}|${scopes.join(' ')}`).toString('base64')}`

export {
  BAD_PROVIDER_UUID,
  PROVIDER_AUTH,
  COMPLIANCE_AUTH,
  JUMP_TEST_DEVICE_1,
  JUMP_PROVIDER_ID,
  POLICY_JSON,
  SUPERSEDING_POLICY_JSON,
  POLICY2_JSON,
  POLICY3_JSON,
  POLICY4_JSON,
  POLICY5_JSON,
  POLICY_JSON_MISSING_POLICY_ID,
  POLICY_WITH_DUPE_RULE,
  PUBLISH_DATE_VALIDATION_JSON,
  POLICY_UUID,
  PUBLISHED_POLICY,
  DELETEABLE_POLICY,
  SUPERSEDING_POLICY_UUID,
  POLICY2_UUID,
  POLICY3_UUID,
  POLICY4_UUID,
  GEOGRAPHY_UUID,
  GEOGRAPHY2_UUID,
  NONEXISTENT_GEOGRAPHY_UUID,
  START_ONE_MONTH_AGO,
  START_ONE_WEEK_AGO,
  START_ONE_MONTH_FROM_NOW,
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
  SCOPED_AUTH,
  serviceAreaMap,
  restrictedAreas,
  veniceSpecOps,
  TAXI_POLICY
}
