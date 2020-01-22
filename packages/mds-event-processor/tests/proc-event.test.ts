import Sinon from 'sinon'
import assert from 'assert'
import cache from '@mds-core/mds-cache'
import { StateEntry, TripEvent, Timestamp, GpsData } from '@mds-core/mds-types'
import * as procEvent from '../src/proc-event'
import * as procEventUtils from '../src/utils'
import * as annotation from '../src/annotation'

const getMockedTripEvent = (event_type: string, timestamp: Timestamp) => {
  const tripStartA = ({ event_type, timestamp } as unknown) as TripEvent
  return tripStartA
}

const getMockedTripData = () => {
  const tripStartA = getMockedTripEvent('trip_start', 42)
  const tripStartB = getMockedTripEvent('trip_start', 43)

  const trips = {
    'trip-one': [tripStartA],
    'trip-two': [tripStartB]
  }

  return trips
}

describe('Proc Event', () => {
  describe('getAnnotationData()', () => {
    it('Returns no service area given gps coords', () => {
      const expected = { in_bound: false, areas: [] }
      const gpsData: GpsData = { lng: 42, lat: 42 }
      const result = annotation.getAnnotationData(gpsData)
      assert.deepStrictEqual(result, expected)
    })

    it('Returns correct service area given gps coords', () => {
      const expected = {
        in_bound: true,
        areas: [
          {
            id: '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49',
            type: 'district'
          },
          {
            id: '8cfe393c-4dc8-4a1d-922e-034f8577c507',
            type: 'district'
          },
          {
            id: '3abf8e10-a380-45bb-bfd4-ec5b21b1b0b6',
            type: 'district'
          }
        ]
      }
      const gpsData: GpsData = { lng: -118.456185290317, lat: 33.9624723998019 }
      const result = annotation.getAnnotationData(gpsData)
      assert.deepStrictEqual(result, expected)
    })
  })

  describe('findTripStart()', () => {
    it('Errors out if no trip start events are found', () => {
      assert.throws(() => {
        procEventUtils.findTripStart([])
      })
    })

    it('Finds trip_start', () => {
      const event = ({ event_type: 'trip_start' } as unknown) as TripEvent
      assert.deepStrictEqual(procEventUtils.findTripStart([event]), event)
    })

    it('Finds trip_enter', () => {
      const event = ({ event_type: 'trip_enter' } as unknown) as TripEvent
      assert.deepStrictEqual(procEventUtils.findTripStart([event]), event)
    })
  })

  describe('getSortedTripStarts()', () => {
    it('Sorts trip start events by timestamp', () => {
      const trips = getMockedTripData()

      const result = procEventUtils.getSortedTripStarts(trips)
      const expected = [
        { tripId: 'trip-two', tripStart: trips['trip-two'][0] },
        { tripId: 'trip-one', tripStart: trips['trip-one'][0] }
      ]
      assert.deepStrictEqual(result, expected)
    })
  })

  describe('getTripId()', () => {
    it('Returns null when there are no prior trips', async () => {
      const fakeReadTripsEvents = Sinon.fake.resolves(null)
      Sinon.replace(cache, 'readTripsEvents', fakeReadTripsEvents)
      const fakeDeviceState: StateEntry = {} as StateEntry
      const result = await procEventUtils.getTripId(fakeDeviceState)
      assert.strictEqual(result, null)
      Sinon.restore()
    })

    it('Returns null when it fails to find trip events', async () => {
      const fakeReadTripsEvents = Sinon.fake.resolves({})
      Sinon.replace(cache, 'readTripsEvents', fakeReadTripsEvents)
      const fakeDeviceState: StateEntry = {} as StateEntry
      const result = await procEventUtils.getTripId(fakeDeviceState)
      assert.strictEqual(result, null)
      Sinon.restore()
    })

    it('Finds the timestamp match', async () => {
      const trips = getMockedTripData()
      const fakeReadTripsEvents = Sinon.fake.resolves(trips)
      Sinon.replace(cache, 'readTripsEvents', fakeReadTripsEvents)
      const fakeDeviceState: StateEntry = {
        timestamp: 44
      } as StateEntry
      const result = await procEventUtils.getTripId(fakeDeviceState)
      assert.strictEqual(result, 'trip-two')
      Sinon.restore()
    })

    it('Does not find matching timestamp', async () => {
      const trips = getMockedTripData()
      const fakeReadTripsEvents = Sinon.fake.resolves(trips)
      Sinon.replace(cache, 'readTripsEvents', fakeReadTripsEvents)
      const fakeDeviceState: StateEntry = {
        timestamp: 41
      } as StateEntry
      const result = await procEventUtils.getTripId(fakeDeviceState)
      assert.strictEqual(result, null)
      Sinon.restore()
    })
  })

  describe('processTripTelemetry()', () => {
    it('Returns false if unable to match', async () => {
      const fakeGetTripId = Sinon.fake.resolves(null)
      Sinon.replace(procEventUtils, 'getTripId', fakeGetTripId)
      const fakeDeviceState: StateEntry = {
        timestamp: 41,
        type: 'telemetry'
      } as StateEntry
      const result = await procEvent.processTripTelemetry(fakeDeviceState)
      assert.strictEqual(result, false)
      Sinon.restore()
    })

    it('Writes to trip map', async () => {
      const fakeGetTripId = Sinon.fake.resolves('fake-trip-id')
      Sinon.replace(procEventUtils, 'getTripId', fakeGetTripId)

      const fakeReadTripsTelemetry = Sinon.fake.resolves(null)
      Sinon.replace(cache, 'readTripsTelemetry', fakeReadTripsTelemetry)

      const fakeWriteTripsTelemetry = Sinon.fake.resolves('foo')
      Sinon.replace(cache, 'writeTripsTelemetry', fakeWriteTripsTelemetry)

      const fakeDeviceState: StateEntry = {
        timestamp: 41,
        type: 'telemetry',
        provider_id: 'fake-provider-id',
        device_id: 'fake-device-id'
      } as StateEntry
      const result = await procEvent.processTripTelemetry(fakeDeviceState)
      assert.strictEqual(result, true)
      assert.strictEqual(
        fakeWriteTripsTelemetry.args[0][0],
        `${fakeDeviceState.provider_id}:${fakeDeviceState.device_id}`
      )
      const expected = {
        'fake-trip-id': [
          {
            timestamp: 41,
            latitude: null,
            longitude: null,
            annotation_version: undefined,
            annotation: undefined,
            service_area_id: undefined
          }
        ]
      }
      assert.deepStrictEqual(fakeWriteTripsTelemetry.args[0][1], expected)
      Sinon.restore()
    })
  })
  describe('processTripEvent()', () => {
    it('Returns false if unable to match', async () => {
      const fakeDeviceState: StateEntry = {
        trip_id: null
      } as StateEntry
      const result = await procEvent.processTripEvent(fakeDeviceState)
      assert.strictEqual(result, false)
    })

    it('Writes to event map', async () => {
      const fakeReadTripsEvents = Sinon.fake.resolves(null)
      Sinon.replace(cache, 'readTripsEvents', fakeReadTripsEvents)

      const fakeWriteTripsEvents = Sinon.fake.resolves('foo')
      Sinon.replace(cache, 'writeTripsEvents', fakeWriteTripsEvents)

      const fakeDeviceState: StateEntry = {
        trip_id: 'fake-trip-id',
        provider_id: 'fake-provider-id',
        device_id: 'fake-device-id'
      } as StateEntry
      const result = await procEvent.processTripEvent(fakeDeviceState)
      assert.strictEqual(result, true)
      assert.strictEqual(fakeWriteTripsEvents.args[0][0], `${fakeDeviceState.provider_id}:${fakeDeviceState.device_id}`)
      const expected = {
        'fake-trip-id': [
          {
            vehicle_type: undefined,
            timestamp: undefined,
            event_type: undefined,
            event_type_reason: undefined,
            annotation_version: undefined,
            annotation: undefined,
            gps: undefined,
            service_area_id: undefined
          }
        ]
      }
      assert.deepStrictEqual(fakeWriteTripsEvents.args[0][1], expected)
      Sinon.restore()
    })
  })
})
