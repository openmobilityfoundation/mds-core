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
  VEHICLE_STATUSES,
  VEHICLE_STATUS, UUID, Device, Timestamp, Telemetry, VehicleEvent } from '@mds-core/mds-types'
import { Geometry } from 'geojson'
import { StatusChange, Trip } from '@mds-core/mds-db/types'

import { addDistanceBearing, pointInShape, makePointInShape, rangeRandom, rangeRandomInt, range, now } from '@mds-core/mds-utils'

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
  let t = Object.assign({}, origin) as Telemetry & { gps: { heading: number } }
  Object.assign(t.gps, origin.gps)
  range(steps).map(() => {
    t = Object.assign({}, t)
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
  const vehicleEventsKeys = Object.keys(VEHICLE_EVENTS)
  const vehicleStatusKeys = Object.keys(VEHICLE_STATUSES)
  const event_reason = vehicleEventsKeys[rangeRandomInt(vehicleEventsKeys.length)]
  const event_type = vehicleStatusKeys[rangeRandomInt(vehicleStatusKeys.length)]

  return {
    provider_id: device.provider_id,
    provider_name: providerName(device.provider_id),
    device_id: device.device_id,
    vehicle_id: device.vehicle_id,
    event_type: event_type as VEHICLE_STATUS,
    event_type_reason: event_reason as VEHICLE_EVENT,
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
