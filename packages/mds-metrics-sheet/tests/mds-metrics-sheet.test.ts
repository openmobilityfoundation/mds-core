import assert from 'assert'
import uuid from 'uuid'
import { mapProviderToPayload, eventCountsToStatusCounts, sum, percent } from '../metrics-log'
import { VehicleCountRow, LastDayStatsResponse } from '../types'
import { mapRow, sumColumns } from '../vehicle-counts'

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
    register: 42,
    service_start: 42,
    service_end: 42,
    provider_drop_off: 42,
    provider_pick_up: 42,
    agency_pick_up: 42,
    agency_drop_off: 42,
    reserve: 42,
    cancel_reservation: 42,
    trip_start: 42,
    trip_enter: 42,
    trip_leave: 42,
    trip_end: 42,
    deregister: 42
  }
}

const getLastDayStatsResponse = (provider_id: string): LastDayStatsResponse => {
  return {
    // TODO type out
    [provider_id]: {
      trips_last_24h: 1,
      ms_since_last_event: 5582050,
      telemetry_counts_last_24h: 5,
      late_telemetry_counts_last_24h: 1,
      events_last_24h: 3,
      events_not_in_conformance: 1,
      name: 'fake-name',
      event_counts_last_24h: {
        register: 42,
        service_start: 42,
        service_end: 42,
        provider_drop_off: 42,
        provider_pick_up: 42,
        agency_pick_up: 42,
        agency_drop_off: 42,
        reserve: 42,
        cancel_reservation: 42,
        trip_start: 42,
        trip_enter: 42,
        trip_leave: 42,
        trip_end: 42,
        deregister: 42
      },
      late_event_counts_last_24h: {
        register: 42,
        service_start: 42,
        service_end: 42,
        provider_drop_off: 42,
        provider_pick_up: 42,
        agency_pick_up: 42,
        agency_drop_off: 42,
        reserve: 42,
        cancel_reservation: 42,
        trip_start: 42,
        trip_enter: 42,
        trip_leave: 42,
        trip_end: 42,
        deregister: 42
      }
    }
  }
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

describe('MDS Metrics Sheet', () => {
  describe('Utility functions', () => {
    it('Maps event counts to status counts', () => {
      const event = {
        register: 42,
        service_start: 42,
        service_end: 42,
        provider_drop_off: 42,
        provider_pick_up: 42,
        agency_pick_up: 42,
        agency_drop_off: 42,
        reserve: 42,
        cancel_reservation: 42,
        trip_start: 42,
        trip_enter: 42,
        trip_leave: 42,
        trip_end: 42,
        deregister: 42
      }
      const result = eventCountsToStatusCounts(event)
      const expected = {
        available: 210,
        elsewhere: 42,
        inactive: 42,
        removed: 126,
        reserved: 42,
        trip: 84,
        unavailable: 42
      }
      assert.deepStrictEqual(result, expected)
    })

    it('Computes `sum()` correctly', () => {
      const arr = [1, 2, 3]
      assert.equal(sum(arr), 6)
    })

    it('Computes `percent()` correctly', () => {
      assert.equal(percent(9, 100), 0.91)
    })
  })

  describe('Metrics Log mapping function', () => {
    it('Maps a provider to the correct payload', () => {
      const provider = getProvider()
      const lastDayStatsResponse = getLastDayStatsResponse(provider.provider_id)
      const result = mapProviderToPayload(provider, lastDayStatsResponse)
      const expected = {
        date: result.date,
        name: 'fake-provider',
        registered: 42,
        deployed: 72,
        validtrips: 'tbd',
        trips: 1,
        servicestart: 42,
        providerdropoff: 42,
        tripstart: 42,
        tripend: 42,
        tripenter: 42,
        tripleave: 42,
        telemetry: 5,
        telemetrysla: 0.8,
        tripstartsla: 0,
        tripendsla: 0,
        available: 210,
        unavailable: 42,
        reserved: 42,
        trip: 84,
        removed: 126,
        inactive: 42,
        elsewhere: 42
      }
      assert.deepStrictEqual(result, expected)
    })

    it('Maps `lastDayStatsResponse` sans `event_counts_last_24h` to the correct payload', () => {
      const provider = getProvider()
      const lastDayStatsResponse = getLastDayStatsResponse(provider.provider_id)
      lastDayStatsResponse[provider.provider_id].event_counts_last_24h = undefined
      const result = mapProviderToPayload(provider, lastDayStatsResponse)
      const expected = {
        date: result.date,
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
      assert.deepStrictEqual(result, expected)
    })

    it('Maps `lastDayStatsResponse` sans `late_telemetry_counts_last_24h` to the correct payload', () => {
      const provider = getProvider()
      const lastDayStatsResponse = getLastDayStatsResponse(provider.provider_id)
      lastDayStatsResponse[provider.provider_id].late_telemetry_counts_last_24h = undefined
      const result = mapProviderToPayload(provider, lastDayStatsResponse)
      const expected = {
        date: result.date,
        name: 'fake-provider',
        registered: 42,
        deployed: 72,
        validtrips: 'tbd',
        trips: 1,
        servicestart: 42,
        providerdropoff: 42,
        tripstart: 42,
        tripend: 42,
        tripenter: 42,
        tripleave: 42,
        telemetry: 5,
        telemetrysla: 0,
        tripstartsla: 0,
        tripendsla: 0,
        available: 210,
        unavailable: 42,
        reserved: 42,
        trip: 84,
        removed: 126,
        inactive: 42,
        elsewhere: 42
      }
      assert.deepStrictEqual(result, expected)
    })

    it('Maps `lastDayStatsResponse` sans `late_event_counts_last_24h` to the correct payload', () => {
      const provider = getProvider()
      const lastDayStatsResponse = getLastDayStatsResponse(provider.provider_id)
      lastDayStatsResponse[provider.provider_id].late_event_counts_last_24h = undefined
      const result = mapProviderToPayload(provider, lastDayStatsResponse)
      const expected = {
        date: result.date,
        name: 'fake-provider',
        registered: 42,
        deployed: 72,
        validtrips: 'tbd',
        trips: 1,
        servicestart: 42,
        providerdropoff: 42,
        tripstart: 42,
        tripend: 42,
        tripenter: 42,
        tripleave: 42,
        telemetry: 5,
        telemetrysla: 0.8,
        tripstartsla: 0,
        tripendsla: 0,
        available: 210,
        unavailable: 42,
        reserved: 42,
        trip: 84,
        removed: 126,
        inactive: 42,
        elsewhere: 42
      }
      assert.deepStrictEqual(result, expected)
    })
  })

  it('Maps empty row correctly', () => {
    const areas_48h = {}
    const row = { areas_48h, provider: 'fake-provider' } as VehicleCountRow
    const actual = mapRow(row)
    const expected = { date: actual.date, name: 'fake-provider', 'Venice Area': 0 }
    assert.deepStrictEqual(actual, expected)
  })

  it('Maps filled in row correctly', () => {
    const areas_48h: VehicleCountRow['areas_48h'] = {}
    const veniceAreaKeys = ['Venice', 'Venice Beach', 'Venice Canals', 'Venice Beach Special Operations Zone']
    for (const veniceAreaKey of veniceAreaKeys) {
      areas_48h[veniceAreaKey] = 5
    }
    const row = { areas_48h, provider: 'fake-provider' } as VehicleCountRow
    const actual = mapRow(row)
    const expected = {
      date: actual.date,
      name: 'fake-provider',
      Venice: 5,
      'Venice Area': 20,
      'Venice Beach': 5,
      'Venice Beach Special Operations Zone': 5,
      'Venice Canals': 5
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('Summarizes over Venice correctly', () => {
    const areas_48h: VehicleCountRow['areas_48h'] = {}
    const veniceAreaKeys = ['Venice', 'Venice Beach', 'Venice Canals', 'Venice Beach Special Operations Zone']
    for (const veniceAreaKey of veniceAreaKeys) {
      areas_48h[veniceAreaKey] = 5
    }
    const row = { areas_48h, provider: 'fake-provider' } as VehicleCountRow
    const actual = sumColumns(veniceAreaKeys, row)
    assert.strictEqual(actual, 20)
  })

  it('Summarizes over Venice correctly with undefined column entries', () => {
    const areas_48h: VehicleCountRow['areas_48h'] = {}
    const veniceAreaKeys = ['Venice', 'Venice Beach', 'Venice Canals', 'Venice Beach Special Operations Zone']
    for (const veniceAreaKey of veniceAreaKeys) {
      if (veniceAreaKey !== 'Venice') {
        areas_48h[veniceAreaKey] = 5
      }
    }
    const row = { areas_48h, provider: 'fake-provider' } as VehicleCountRow
    const actual = sumColumns(veniceAreaKeys, row)
    assert.strictEqual(actual, 15)
  })
})
