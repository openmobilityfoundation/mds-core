import assert from 'assert'
import uuid from 'uuid'
import { mapProviderToPayload } from '../metrics-log'
import { VehicleCountRow, LastDayStatsResponse } from '../types'

const getStatus = (): VehicleCountRow['status'] => {
  return {
    available: 42,
    reserved: 20,
    unavailable: 5,
    removed: 0,
    inactive: 3,
    trip: 5,
    elsewhere: 17
  }
}

const getEvent = (): VehicleCountRow['event_type'] => {
  return {
    // TODO type out these fields
  } as VehicleCountRow['event_type']
}

const getLastDayStatsResponse = (provider_id: string): LastDayStatsResponse => {
  return {
    // TODO type out
    [provider_id]: {
      trips_last_24h: 1,
      ms_since_last_event: 5582050,
      late_event_counts_last_24h: {},
      telemetry_counts_last_24h: 5,
      late_telemetry_counts_last_24h: 1,
      events_last_24h: 3,
      events_not_in_conformance: 1,
      name: 'fake-name'
    }
  } as LastDayStatsResponse
}

const getProvider = (): VehicleCountRow => {
  return {
    provider_id: uuid(),
    provider: 'fake-provider',
    count: 42,
    status: getStatus(),
    event_type: getEvent(),
    areas: {},
    areas_48h: {}
  }
}

const getExpectedPayload = (date: string) => {
  return {
    date,
    name: 'fake-provider',
    registered: 42,
    deployed: 72,
    validtrips: 'tbd',
    trips: 1,
    servicestart: 0,
    providerdropoff: 0,
    tripstart: 0,
    tripend: 0,
    tripenter: 0,
    tripleave: 0,
    telemetry: 0,
    telemetrysla: 0,
    tripstartsla: 0,
    tripendsla: 0,
    available: 0,
    unavailable: 0,
    reserved: 0,
    trip: 0,
    removed: 0,
    inactive: 0,
    elsewhere: 0
  }
}

describe('MDS Metrics Sheet', () => {
  describe('Metrics Log', () => {
    it('Maps a provider to the correct payload', () => {
      const provider = getProvider()
      const lastDayStatsResponse = getLastDayStatsResponse(provider.provider_id)
      const result = mapProviderToPayload(provider, lastDayStatsResponse)
      const expected = getExpectedPayload(result.date)
      assert.deepStrictEqual(result, expected)
    })
  })
})
