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

import { TEST1_PROVIDER_ID } from '@mds-core/mds-providers'
import { Device } from '@mds-core/mds-types'
import { now, uuid } from '@mds-core/mds-utils'
import { EventAnnotationDomainCreateModel, EventDomainCreateModel, TelemetryDomainCreateModel } from '../@types'
import { IngestServiceClient } from '../client'
import { IngestRepository } from '../repository'
import { IngestServiceManager } from '../service/manager'

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
  // test-id-1
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
  // test-id-1
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
  // test-id-2
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
  // test-id-2
}

const GEOGRAPHY_ID_A = uuid()
const GEOGRAPHY_ID_B = uuid()
const GEOGRAPHY_ID_C = uuid()
const GEOGRAPHY_ID_D = uuid()

const TEST_EVENT_ANNOTATION_A: EventAnnotationDomainCreateModel = {
  events_row_id: 1,
  device_id: DEVICE_UUID_A,
  timestamp: testTimestamp,
  vehicle_id: 'test-id-1',
  vehicle_type: 'scooter',
  propulsion_types: ['electric'],
  geography_ids: [GEOGRAPHY_ID_A, GEOGRAPHY_ID_B],
  geography_types: ['jurisdiction', null],
  latency_ms: 100
}

const TEST_EVENT_ANNOTATION_B: EventAnnotationDomainCreateModel = {
  events_row_id: 2,
  device_id: DEVICE_UUID_B,
  timestamp: testTimestamp,
  vehicle_id: 'test-id-2',
  vehicle_type: 'scooter',
  propulsion_types: ['electric'],
  geography_ids: [GEOGRAPHY_ID_C, GEOGRAPHY_ID_D],
  geography_types: [null, 'spot'],
  latency_ms: 150
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
      it('gets using options/cursor', async () => {
        const options = await IngestServiceClient.getDevicesUsingOptions({ limit: 1 })
        expect(options.devices).toHaveLength(1)
        expect(options.cursor.prev).toBeNull()
        expect(options.cursor.next).not.toBeNull()
        if (options.cursor.next) {
          const cursor = await IngestServiceClient.getDevicesUsingCursor(options.cursor.next)
          expect(cursor.devices).toHaveLength(1)
          expect(cursor.cursor.prev).not.toBeNull()
          expect(cursor.cursor.next).toBeNull()
        }
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

  describe('getEventsUsingOptions', () => {
    beforeEach(async () => {
      await IngestRepository.createDevices([TEST_TNC_A, TEST_TNC_B])
      await IngestRepository.createEvents([TEST_EVENT_A1, TEST_EVENT_B1])
      await IngestRepository.createEvents([TEST_EVENT_A2, TEST_EVENT_B2])
      await IngestRepository.createTelemetries([TEST_TELEMETRY_A1, TEST_TELEMETRY_B1])
      await IngestRepository.createTelemetries([TEST_TELEMETRY_A2, TEST_TELEMETRY_B2])
      await IngestServiceClient.writeEventAnnotations([TEST_EVENT_ANNOTATION_A, TEST_EVENT_ANNOTATION_B])
    })
    describe('all_events', () => {
      it('filter on one valid geography id', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          grouping_type: 'all_events',
          geography_ids: [GEOGRAPHY_ID_A]
        })
        expect(events.length).toEqual(1)
      })
      it('filter on two valid geography id', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          grouping_type: 'all_events',
          geography_ids: [GEOGRAPHY_ID_A, GEOGRAPHY_ID_C]
        })
        expect(events.length).toEqual(2)
      })
      it('filter on non-existent geography id', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          grouping_type: 'all_events',
          geography_ids: [uuid()]
        })
        expect(events.length).toEqual(0)
      })
      it('gets 4 events', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          grouping_type: 'all_events'
        })
        expect(events.length).toEqual(4)
      })
      it('gets no events, filtered on time start/end', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp + 4000, end: testTimestamp + 8000 },
          grouping_type: 'all_events'
        })
        expect(events.length).toEqual(0)
      })

      it('gets 4 events, but limit to 1', async () => {
        const limit = 1
        const {
          events,
          cursor: { next, prev }
        } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          grouping_type: 'all_events',
          limit
        })
        expect(events.length).toEqual(1)
        expect(next).not.toBeNull()
      })

      it('gets two events, filters on event_types', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          event_types: ['service_end'],
          grouping_type: 'all_events'
        })
        expect(events.length).toEqual(2)
      })

      it('gets events in order provided (vehicle_state)', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          order: { column: 'vehicle_state', direction: 'ASC' },
          grouping_type: 'all_events',
          limit: 1
        })
        expect(events[0].vehicle_state).toEqual('removed')

        // reverse order
        const { events: eventsDesc } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          order: { column: 'vehicle_state', direction: 'DESC' },
          grouping_type: 'all_events'
        })

        expect(eventsDesc[0].vehicle_state).toEqual('unknown')
      })

      it('gets events in order provided (vehicle_state)', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          order: { column: 'vehicle_state', direction: 'ASC' },
          grouping_type: 'all_events'
        })
        expect(events[0].vehicle_state).toEqual('removed')

        // reverse order
        const { events: eventsDesc } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          order: { column: 'vehicle_state', direction: 'DESC' },
          grouping_type: 'all_events'
        })

        expect(eventsDesc[0].vehicle_state).toEqual('unknown')
      })

      it('respects order when cursor is used', async () => {
        const {
          events,
          cursor: { next }
        } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          order: { column: 'vehicle_state', direction: 'ASC' },
          grouping_type: 'all_events',
          limit: 2
        })
        expect(events.length).toEqual(2)
        expect(events[0].vehicle_state).toEqual('removed')
        expect(next).not.toBeNull()

        if (next) {
          // reverse order
          const {
            events: nextEvents,
            cursor: { prev }
          } = await IngestServiceClient.getEventsUsingCursor(next)

          expect(nextEvents.length).toEqual(2)
          expect(prev).not.toBeNull()
          expect(nextEvents[0].vehicle_state).toEqual('unknown')
        }
      })

      it('uses secondary (timestamp) sort order when primary sort values are equal', async () => {
        const {
          events,
          cursor: { next }
        } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          order: { column: 'provider_id', direction: 'ASC' },
          grouping_type: 'all_events',
          limit: 4
        })

        expect(events[0].timestamp).toBeLessThan(events[events.length - 1].timestamp)

        const {
          events: descEvents,
          cursor: { next: descNext }
        } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          order: { column: 'provider_id', direction: 'DESC' },
          grouping_type: 'all_events',
          limit: 4
        })

        expect(descEvents[0].timestamp).toBeGreaterThan(descEvents[descEvents.length - 1].timestamp)
      })
    })

    describe('latest_per_vehicle', () => {
      it('gets two events, one for each device, telemetry is loaded', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
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
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          event_types: ['service_end'],
          grouping_type: 'latest_per_trip'
        })
        expect(events.length).toEqual(2)
      })
    })

    describe('latest_per_vehicle', () => {
      it('gets two events, one for each device', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on event_types', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          event_types: ['service_end'],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on propulsion type', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          propulsion_types: ['electric'],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on device_ids', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          device_ids: [DEVICE_UUID_A, DEVICE_UUID_B],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on vehicle_type', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          vehicle_types: ['car'],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on vehicle_states', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          vehicle_states: ['unknown'],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })

      it('gets two events, filters on vehicle_id', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          vehicle_id: TEST_TNC_A.vehicle_id,
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(1)
      })

      it('gets two events, filters on provider_ids', async () => {
        const { events } = await IngestServiceClient.getEventsUsingOptions({
          time_range: { start: testTimestamp, end: testTimestamp + 2000 },
          provider_ids: [TEST1_PROVIDER_ID],
          grouping_type: 'latest_per_vehicle'
        })
        expect(events.length).toEqual(2)
      })
    })
  })

  describe('getEventsUsingCursor', () => {
    beforeEach(async () => {
      await IngestRepository.createDevices([TEST_TNC_A, TEST_TNC_B])
      await IngestRepository.createEvents([TEST_EVENT_A1, TEST_EVENT_B1])
      await IngestRepository.createEvents([TEST_EVENT_A2, TEST_EVENT_B2])
      await IngestRepository.createTelemetries([TEST_TELEMETRY_A1, TEST_TELEMETRY_B1])
      await IngestRepository.createTelemetries([TEST_TELEMETRY_A2, TEST_TELEMETRY_B2])
    })

    it('fetches the next page', async () => {
      // First page
      const {
        events,
        cursor: { next }
      } = await IngestServiceClient.getEventsUsingOptions({
        time_range: { start: testTimestamp, end: testTimestamp + 2000 },
        grouping_type: 'all_events',
        limit: 1
      })

      expect(events.length).toEqual(1)
      expect(next).not.toBeNull()

      // Use cursor for next page
      if (next) {
        const {
          events: nextEvents,
          cursor: { prev }
        } = await IngestServiceClient.getEventsUsingCursor(next)

        expect(nextEvents.length).toEqual(1)
        expect(nextEvents[0]).not.toStrictEqual(events[0])
        expect(prev).not.toBeNull()
      }
    })
  })

  describe('writeEventAnnotations', () => {
    it('writes two event annotations', async () => {
      const eventAnnotations = await IngestServiceClient.writeEventAnnotations([
        TEST_EVENT_ANNOTATION_A,
        TEST_EVENT_ANNOTATION_B
      ])
      // Remove event_row_id since this is not returned.
      const { events_row_id: EVENT_ROW_ID_A, ...RESULT_A } = TEST_EVENT_ANNOTATION_A
      const { events_row_id: EVENT_ROW_ID_B, ...RESULT_B } = TEST_EVENT_ANNOTATION_B
      expect(eventAnnotations.length).toEqual(2)
      // Test for partial object match since eventAnnotations also have `recorded`
      expect(eventAnnotations).toEqual(
        expect.arrayContaining([expect.objectContaining(RESULT_A), expect.objectContaining(RESULT_B)])
      )
    })

    it('rejects invalid event annotations', async () => {
      const INVALID_EVENT_ANNOTATION = { ...TEST_EVENT_ANNOTATION_A, geography_ids: ['not-a-uuid'] }
      await expect(IngestServiceClient.writeEventAnnotations([INVALID_EVENT_ANNOTATION])).rejects.toMatchObject({
        type: 'ValidationError'
      })
    })

    it('rejects duplicate event annotations', async () => {
      // Event annotations require device_id + timestamp to be unique
      await expect(
        IngestServiceClient.writeEventAnnotations([TEST_EVENT_ANNOTATION_A, TEST_EVENT_ANNOTATION_A])
      ).rejects.toMatchObject({
        type: 'ConflictError'
      })
    })

    it('gets events with 2 annotations', async () => {
      await IngestRepository.createDevices([TEST_TNC_A, TEST_TNC_B])
      await IngestRepository.createEvents([TEST_EVENT_A1, TEST_EVENT_B1])
      await IngestRepository.createEvents([TEST_EVENT_A2, TEST_EVENT_B2])
      await IngestServiceClient.writeEventAnnotations([TEST_EVENT_ANNOTATION_A, TEST_EVENT_ANNOTATION_B])
      const { events } = await IngestServiceClient.getEventsUsingOptions({
        time_range: { start: testTimestamp, end: testTimestamp + 2000 },
        grouping_type: 'all_events'
      })
      expect(events.filter(e => e.annotation).length).toEqual(2)
    })
  })

  describe('writes migrated data', () => {
    it('writes migrated device', async () => {
      expect(
        await IngestServiceClient.writeMigratedDevice(
          { recorded: 0, ...TEST_TNC_A },
          { migrated_from_source: 'mds.device', migrated_from_version: '0.0', migrated_from_id: 1 }
        )
      ).toMatchObject(TEST_TNC_A)
    })

    it('writes migrated event', async () => {
      expect(
        await IngestServiceClient.writeMigratedVehicleEvent(
          { trip_state: null, recorded: 0, ...TEST_EVENT_A1 },
          { migrated_from_source: 'mds.event', migrated_from_version: '0.0', migrated_from_id: 1 }
        )
      ).toMatchObject(TEST_EVENT_A1)
    })

    it('writes migrated telemetry', async () => {
      expect(
        await IngestServiceClient.writeMigratedTelemetry(
          { recorded: 0, ...TEST_TELEMETRY_A1 },
          { migrated_from_source: 'mds.telemetry', migrated_from_version: '0.0', migrated_from_id: 1 }
        )
      ).toMatchObject(TEST_TELEMETRY_A1)
    })
  })

  afterAll(async () => {
    await IngestRepository.shutdown()
    await IngestServer.stop()
  })
})
