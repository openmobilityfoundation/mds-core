import { StateEntry, TripEvent, TripsEvents, VEHICLE_EVENTS } from '@mds-core/mds-types'
import cache from '@mds-core/mds-cache'
import log from '@mds-core/mds-logger'

export const findTripStart = (tripEvents: TripEvent[]): TripEvent => {
  const result = tripEvents.find(tripEvent => {
    return tripEvent.event_type === VEHICLE_EVENTS.trip_start || tripEvent.event_type === VEHICLE_EVENTS.trip_enter
  })
  if (result === undefined) {
    throw new Error('NO TRIP START FOUND')
  }
  return result
}

export const getSortedTripStarts = (tripsEvents: TripsEvents) => {
  const startEventEntries = Object.entries(tripsEvents).map(entry => {
    const [tripId, tripEvents] = entry
    return { tripId, tripStart: findTripStart(tripEvents) }
  })
  const sortedStartEvents = startEventEntries.sort((a, b) => {
    return b.tripStart.timestamp - a.tripStart.timestamp
  })
  return sortedStartEvents
}

export async function getTripId(deviceState: StateEntry): Promise<string | null> {
  /*
    Return trip_id for telemetery entry by associating timestamps
  */
  const { provider_id, device_id, timestamp } = deviceState
  const tripsEvents = await cache.readDeviceTripsEvents(`${provider_id}:${device_id}:*`)
  if (!tripsEvents) {
    log.info(`NO PRIOR TRIP EVENTS FOUND for ${provider_id}:${device_id}`)
    return null
  }
  try {
    const sortedStartEvents = getSortedTripStarts(tripsEvents)
    const match = sortedStartEvents.find(tripStartData => {
      return timestamp >= tripStartData.tripStart.timestamp
    })
    return match?.tripId ?? null
  } catch (err) {
    await log.error(err)
    return null
  }
}
