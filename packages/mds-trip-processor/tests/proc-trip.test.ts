import assert from 'assert'
import { TripEvent, Timestamp, TripTelemetry, TripTelemetryField } from '@mds-core/mds-types'
import { calcDistance, routeDistance } from '@mds-core/mds-utils'
import * as procTripUtils from '../src/utils'

const max_telemetry_time = 86400

const getMockedTripEvent = (event_type: string, timestamp: Timestamp) => {
  const tripStartA = ({ event_type, timestamp } as unknown) as TripEvent
  return tripStartA
}

const getMockedTripTelemetry = (timestamp: Timestamp) => {
  const telemetry = ({ timestamp } as unknown) as TripTelemetry
  return telemetry
}

const getMockedTripTelemetryWithGPS = (timestamp: Timestamp, latitude: number, longitude: number) => {
  const telemetry = ({ timestamp, latitude, longitude } as unknown) as TripTelemetry
  return telemetry
}

const getMockedTripEventMap = () => {
  const tripEventA = getMockedTripEvent('trip_start', 42)
  const tripEventB = getMockedTripEvent('trip_end', 44)
  const tripEventC = getMockedTripEvent('trip_start', 52)
  const tripEventD = getMockedTripEvent('trip_end', 54)

  const trips = {
    'trip-one': [tripEventA, tripEventB],
    'trip-two': [tripEventC, tripEventD]
  }

  return trips
}

const getMockedTripTelemetryMap = () => {
  const telemetryA = getMockedTripTelemetry(42)
  const telemetryB = getMockedTripTelemetry(43)
  const telemetryC = getMockedTripTelemetry(44)
  const telemetryD = getMockedTripTelemetry(52)
  const telemetryE = getMockedTripTelemetry(53)
  const telemetryF = getMockedTripTelemetry(54)

  const trips = {
    'trip-one': [telemetryA, telemetryB, telemetryC],
    'trip-two': [telemetryD, telemetryE, telemetryF]
  }

  return trips
}

describe('Proc Trip', () => {
  describe('eventValidation()', () => {
    it('Returns false if only one trip event is found (incomplete trip)', () => {
      const events = [getMockedTripEvent('trip_start', 42)]
      const result = procTripUtils.eventValidation(events, 42, max_telemetry_time)
      assert.strictEqual(result, false)
    })

    it('Returns false if trip_end is less than SLA delay', () => {
      const events = [getMockedTripEvent('trip_end', 42), getMockedTripEvent('trip_start', 0)]
      const result = procTripUtils.eventValidation(events, 42, max_telemetry_time)
      assert.strictEqual(result, false)
    })

    it('Check if validation steps pass', () => {
      const events = [getMockedTripEvent('trip_end', 42), getMockedTripEvent('trip_start', 0)]
      const result = procTripUtils.eventValidation(events, 43 + max_telemetry_time, max_telemetry_time)
      assert.strictEqual(result, true)
    })
  })

  describe('createTelemetryMap()', () => {
    it('Errors out if trip telemetry does not exist', () => {
      const telemetryMap = getMockedTripTelemetryMap()
      assert.throws(() => {
        procTripUtils.createTelemetryMap([], telemetryMap, 'fake-trip-id')
      })
    })

    it('Maps telemtry points to trip events', () => {
      const telemetryMap = getMockedTripTelemetryMap()
      const events = getMockedTripEventMap()
      const expected: { [event: number]: TripTelemetry[] } = {
        '42': [getMockedTripTelemetry(42), getMockedTripTelemetry(43)],
        '44': [getMockedTripTelemetry(44)]
      }
      const result = procTripUtils.createTelemetryMap(events['trip-one'], telemetryMap, 'trip-one')
      assert.deepStrictEqual(result, expected)
    })
  })

  describe('calcDistance()', () => {
    it('Calculates distance between telemetries', () => {
      const tripTelemetry: TripTelemetryField = {
        '42': [getMockedTripTelemetryWithGPS(42, 0, 0), getMockedTripTelemetryWithGPS(43, 0, 100)],
        '44': [getMockedTripTelemetryWithGPS(44, 100, 100)]
      }
      const expected = {
        distance:
          routeDistance([
            { lat: 0, lng: 0 },
            { lat: 0, lng: 100 }
          ]) +
          routeDistance([
            { lat: 0, lng: 100 },
            { lat: 100, lng: 100 }
          ]),
        points: [
          routeDistance([
            { lat: 0, lng: 0 },
            { lat: 0, lng: 100 }
          ]),
          routeDistance([
            { lat: 0, lng: 100 },
            { lat: 100, lng: 100 }
          ])
        ]
      }
      const result = calcDistance(tripTelemetry)
      assert.deepStrictEqual(result, expected)
    })
  })
})
