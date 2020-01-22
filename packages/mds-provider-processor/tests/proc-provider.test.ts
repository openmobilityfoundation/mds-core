import Sinon from 'sinon'
import assert from 'assert'
import cache from '@mds-core/mds-cache'
import db from '@mds-core/mds-db'
import { StateEntry, Timestamp, TripTelemetry, UUID, VEHICLE_TYPE, VEHICLE_STATUS } from '@mds-core/mds-types'
import metricUtils from '../src/metrics'

const getMockedState = (
  event_type: string | null = null,
  timestamp: Timestamp = 0,
  state: VEHICLE_STATUS | null = null,
  trip_id: UUID | null = null,
  type = 'event',
  provider_id: UUID = 'fake-provider-id',
  vehicle_type: VEHICLE_TYPE = 'scooter'
) => {
  const tripStartA = ({
    type,
    event_type,
    timestamp,
    state,
    trip_id,
    provider_id,
    vehicle_type
  } as unknown) as StateEntry
  return tripStartA
}

const getMockedGetStates = () => {
  const tripEventA = getMockedState('trip_start', 42, 'available', 'fake-trip-id1')
  const tripEventB = getMockedState('trip_end', 44, 'available', 'fake-trip-id1')
  const tripEventC = getMockedState('trip_start', 52, 'available', 'fake-trip-id2')
  const tripEventD = getMockedState('trip_end', 54, 'available', 'fake-trip-id3')
  const tripEventE = getMockedState('register', 54, 'removed')
  const tripEventF = getMockedState('deregister', 54, 'inactive')
  const tripEventG = getMockedState('register', 54, 'removed')
  const tripEventH = getMockedState(null, 54, null, null, 'telemetry')

  const eventList = [tripEventA, tripEventB, tripEventC, tripEventD, tripEventE, tripEventF, tripEventG, tripEventH]
  return eventList
}

const getMockedTripEntry = (
  timestamp: Timestamp,
  violation_count: number,
  max_violation_dist: number | null,
  min_violation_dist: number | null,
  avg_violation_dist: number | null
) => {
  const telemetry = ({
    timestamp,
    violation_count,
    max_violation_dist,
    min_violation_dist,
    avg_violation_dist
  } as unknown) as TripTelemetry
  return telemetry
}

const getMockedTrips = () => {
  const tripEntryA = getMockedTripEntry(42, 1, 20, 20, 20)
  const tripEntryB = getMockedTripEntry(42, 2, 100, 50, 75)
  const tripEntryC = getMockedTripEntry(42, 0, null, null, null)

  const trips = [tripEntryA, tripEntryB, tripEntryC]
  return trips
}

describe('Metrics', () => {
  describe('calcEventCounts()', () => {
    it('Returns event counts', async () => {
      const states = getMockedGetStates()
      const fakeGetStates = Sinon.fake.resolves(states)
      Sinon.replace(db, 'getStates', fakeGetStates)
      const expected = {
        service_start: 0,
        provider_drop_off: 0,
        trip_end: 2,
        cancel_reservation: 0,
        reserve: 0,
        service_end: 0,
        trip_start: 2,
        trip_enter: 0,
        trip_leave: 0,
        register: 2,
        provider_pick_up: 0,
        agency_drop_off: 0,
        deregister: 1,
        agency_pick_up: 0,
        telemetry: 1
      }
      const result = await metricUtils.calcEventCounts('fake-provider-id', 'scooter', 0, 42)
      assert.deepStrictEqual(result, expected)
      Sinon.restore()
    })
  })

  describe('calcVehicleCounts()', () => {
    it('Returns counts of devices in certain states', async () => {
      const fakeRegisteredVehicles = Sinon.fake.resolves(null)
      Sinon.replace(cache, 'readKeys', fakeRegisteredVehicles)
      const states = getMockedGetStates()
      const fakeGetStates = Sinon.fake.resolves(states)
      Sinon.replace(db, 'getStates', fakeGetStates)
      const fakeReadAllDeviceStates = Sinon.fake.resolves(states)
      Sinon.replace(cache, 'readAllDeviceStates', fakeReadAllDeviceStates)
      const expected = {
        registered: 1,
        deployed: 4,
        dead: null
      }
      const result = await metricUtils.calcVehicleCounts('fake-provider-id', 'scooter', 0, 42)
      assert.deepStrictEqual(result, expected)
      Sinon.restore()
    })
  })

  describe('calcVehicleTripCount()', () => {
    it('Returns counts of devices in certain states', async () => {
      const states = getMockedGetStates()
      const fakeReadAllDeviceStates = Sinon.fake.resolves(states)
      Sinon.replace(cache, 'readAllDeviceStates', fakeReadAllDeviceStates)
      const tripCount = [{ count: 6 }]
      const faketripCount = Sinon.fake.resolves(tripCount)
      Sinon.replace(db, 'getVehicleTripCount', faketripCount)
      const expected = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 8 }
      const result = await metricUtils.calcVehicleTripCount('fake-provider-id', 'scooter', 0, 100)
      assert.deepStrictEqual(result, expected)
      Sinon.restore()
    })
  })

  describe('calcTelemDistViolationCount()', () => {
    it('Returns counts of devices in certain states', async () => {
      const trips = getMockedTrips()
      const fakeTrips = Sinon.fake.resolves(trips)
      Sinon.replace(db, 'getTrips', fakeTrips)
      const expected = { count: 3, min: 20, max: 100, average: 47.5 }
      const result = await metricUtils.calcTelemDistViolationCount('fake-provider-id', 'scooter', 0, 100)
      assert.deepStrictEqual(result, expected)
      Sinon.restore()
    })
  })
})
