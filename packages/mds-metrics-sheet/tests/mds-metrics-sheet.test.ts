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

const getLastDayStatsResponse = (): LastDayStatsResponse => {
  return {
    // TODO type out
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

describe('MDS Metrics Sheet', () => {
  describe('Metrics Log', () => {
    it('Maps a provider to the correct payload', () => {
      const provider = getProvider()
      const lastDayStatsResponse = getLastDayStatsResponse()
      const result = mapProviderToPayload(provider, lastDayStatsResponse)
      console.log({ result })
    })
  })
})
