/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Copyright 2020 City of Los Angeles
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

import { IngestServiceManager } from '../service/manager'
import { IngestServiceClient } from '../client'
import { IngestRepository } from '../repository'
import { TEST1_PROVIDER_ID } from '@mds-core/mds-providers'
import { now, uuid, ValidationError } from '@mds-core/mds-utils'
import { Device, VehicleEvent } from '@mds-core/mds-types'
import { EventEntityCreateModel } from '../repository/mappers'
import { EventDomainCreateModel, TelemetryDomainCreateModel } from '../@types'

const DEVICE_UUID_A = uuid()
const DEVICE_UUID_B = uuid()
const TRIP_UUID_A = uuid()
const TRIP_UUID_B = uuid()
const testTimestamp = now()

const TEST_TELEMETRY_A1: TelemetryDomainCreateModel = {
  device_id: DEVICE_UUID_A,
  provider_id: TEST1_PROVIDER_ID,
  gps: {
    lat: 37.3382,
    lng: -121.8863,
    speed: 0,
    heading: 180,
    accuracy: null,
    altitude: null,
    hdop: null,
    satellites: null
  },
  charge: 0.5,
  timestamp: testTimestamp
}
const TEST_TELEMETRY_A2: TelemetryDomainCreateModel = {
  device_id: DEVICE_UUID_A,
  provider_id: TEST1_PROVIDER_ID,
  gps: {
    lat: 37.3382,
    lng: -121.8863,
    speed: 0,
    heading: 180,
    accuracy: null,
    altitude: null,
    hdop: null,
    satellites: null
  },
  charge: 0.5,
  timestamp: testTimestamp + 1000
}

const TEST_TELEMETRY_B1: TelemetryDomainCreateModel = {
  device_id: DEVICE_UUID_B,
  provider_id: TEST1_PROVIDER_ID,
  gps: {
    lat: 37.3382,
    lng: -121.8863,
    speed: 0,
    heading: 180,
    accuracy: null,
    altitude: null,
    hdop: null,
    satellites: null
  },
  charge: 0.5,
  timestamp: testTimestamp
}
const TEST_TELEMETRY_B2: TelemetryDomainCreateModel = {
  device_id: DEVICE_UUID_B,
  provider_id: TEST1_PROVIDER_ID,
  gps: {
    lat: 37.3382,
    lng: -121.8863,
    speed: 0,
    heading: 180,
    accuracy: null,
    altitude: null,
    hdop: null,
    satellites: null
  },
  charge: 0.5,
  timestamp: testTimestamp + 1000
}

const TEST_TNC_A: Omit<Device, 'recorded'> = {
  accessibility_options: ['wheelchair_accessible'],
  device_id: DEVICE_UUID_A,
  provider_id: TEST1_PROVIDER_ID,
  vehicle_id: 'test-id-1',
  vehicle_type: 'car',
  propulsion_types: ['electric'],
  year: 2018,
  mfgr: 'Schwinn',
  modality: 'tnc',
  model: 'Mantaray'
}

const TEST_TNC_B: Omit<Device, 'recorded'> = {
  accessibility_options: ['wheelchair_accessible'],
  device_id: DEVICE_UUID_B,
  provider_id: TEST1_PROVIDER_ID,
  vehicle_id: 'test-id-2',
  vehicle_type: 'car',
  propulsion_types: ['electric'],
  year: 2018,
  mfgr: 'Schwinn',
  modality: 'tnc',
  model: 'Mantaray'
}

const TEST_EVENT_A1: EventDomainCreateModel = {
  device_id: DEVICE_UUID_A,
  event_types: ['decommissioned'],
  vehicle_state: 'removed',
  trip_state: 'stopped',
  timestamp: testTimestamp,
  telemetry_timestamp: testTimestamp,
  provider_id: TEST1_PROVIDER_ID,
  trip_id: TRIP_UUID_A
}

const TEST_EVENT_A2: EventDomainCreateModel = {
  device_id: DEVICE_UUID_A,
  event_types: ['service_end'],
  vehicle_state: 'unknown',
  trip_state: 'stopped',
  timestamp: testTimestamp + 1000,
  telemetry_timestamp: testTimestamp + 1000,
  provider_id: TEST1_PROVIDER_ID,
  trip_id: TRIP_UUID_A
}

const TEST_EVENT_B1: EventDomainCreateModel = {
  device_id: DEVICE_UUID_B,
  event_types: ['decommissioned'],
  vehicle_state: 'removed',
  trip_state: 'stopped',
  timestamp: testTimestamp,
  telemetry_timestamp: testTimestamp,
  provider_id: TEST1_PROVIDER_ID,
  trip_id: TRIP_UUID_B
}

const TEST_EVENT_B2: EventDomainCreateModel = {
  device_id: DEVICE_UUID_B,
  event_types: ['service_end'],
  vehicle_state: 'unknown',
  trip_state: 'stopped',
  timestamp: testTimestamp + 1000,
  telemetry_timestamp: testTimestamp + 1000,
  provider_id: TEST1_PROVIDER_ID,
  trip_id: TRIP_UUID_B
}

describe('Ingest Repository Tests', () => {
  beforeAll(async () => {
    await IngestRepository.initialize()
  })

  it('Run Migrations', async () => {
    await IngestRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await IngestRepository.revertAllMigrations()
  })

  afterAll(async () => {
    await IngestRepository.shutdown()
  })
})

const IngestServer = IngestServiceManager.controller()

describe('Ingest Service Tests', () => {
  beforeAll(async () => {
    await IngestServer.start()
    await IngestRepository.initialize()
  })

  /**
   * Clear DB after each test runs, and after the file is finished. No side-effects for you.
   */
  beforeEach(async () => {
    await IngestRepository.deleteAll()
  })

  describe('getDevices', () => {
    beforeEach(async () => {
      await IngestRepository.createDevices([TEST_TNC_A, TEST_TNC_B])
    })
    describe('all_devices', () => {
      it('gets 2 devices', async () => {
        const devices = await IngestServiceClient.getDevices([DEVICE_UUID_A, DEVICE_UUID_B])
        expect(devices.length).toEqual(2)
      })
      it('gets 0 devices', async () => {
        const devices = await IngestServiceClient.getDevices([uuid()])
        expect(devices.length).toEqual(0)
      })
      it('get invalid device uuid', async () => {
        await expect(IngestServiceClient.getDevices(['foo-bar'])).rejects.toMatchObject({ type: 'ValidationError' })
      })
      it('get with valid and invalid device uuid', async () => {
        await expect(IngestServiceClient.getDevices([DEVICE_UUID_A, 'foo-bar'])).rejects.toMatchObject({
          type: 'ValidationError'
        })
      })
    })
  })

  describe('getEvents', () => {
    beforeEach(async () => {
      await IngestRepository.createDevices([TEST_TNC_A, TEST_TNC_B])
      await IngestRepository.createEvents([TEST_EVENT_A1, TEST_EVENT_B1])
      await IngestRepository.createEvents([TEST_EVENT_A2, TEST_EVENT_B2])
      await IngestRepository.createTelemetries([TEST_TELEMETRY_A1, TEST_TELEMETRY_B1])
      await IngestRepository.createTelemetries([TEST_TELEMETRY_A2, TEST_TELEMETRY_B2])
    })
    describe('all_events', () => {
      it('gets 4 events', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          grouping_type: 'all_events'
        })
        expect(events.length).toEqual(4)
      })

      it('gets 4 events, but limit to 1', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          grouping_type: 'all_events',
          limit: 1
        })
        expect(events.length).toEqual(1)
      })

      it('gets two events, filters on event_types', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          event_types: ['service_end'],
          grouping_type: 'all_events'
        })
        expect(events.length).toEqual(2)
      })
    })

    describe('latest_per_vehicle', () => {
      it('gets two events, one for each device, telemetry is loaded', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          grouping_type: 'latest_per_trip'
        })
        expect(events.length).toEqual(2)

        events.forEach(e => {
          expect(e.telemetry?.timestamp).toStrictEqual(TEST_TELEMETRY_B2.timestamp)
          expect(e.telemetry?.gps.lat).toStrictEqual(TEST_TELEMETRY_B2.gps.lat)
          expect(e.telemetry?.gps.lng).toStrictEqual(TEST_TELEMETRY_B2.gps.lng)
        })
      })

      it('gets two events, filters on event_types', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          event_types: ['service_end'],
          grouping_type: 'latest_per_trip'
        })
        expect(events.length).toEqual(2)
      })
    })

    describe('latest_per_vehicle', () => {
      it('gets two events, one for each device', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on event_types', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          event_types: ['service_end'],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on propulsion type', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          propulsion_types: ['electric'],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on device_ids', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          device_ids: [DEVICE_UUID_A, DEVICE_UUID_B],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on vehicle_type', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          vehicle_types: ['car'],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on vehicle_states', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          vehicle_states: ['unknown'],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on vehicle_id', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          vehicle_id: TEST_TNC_A.vehicle_id,
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(1)
      })

      it('gets two events, filters on provider_ids', async () => {
        const events = await IngestServiceClient.getEvents({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          provider_ids: [TEST1_PROVIDER_ID],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })
    })
  })

  afterAll(async () => {
    await IngestRepository.shutdown()
    await IngestServer.stop()
  })
})
