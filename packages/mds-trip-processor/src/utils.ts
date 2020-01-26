import { TripEvent, TripTelemetry, TripTelemetryField, Timestamp } from '@mds-core/mds-types'
import log from '@mds-core/mds-logger'

export const eventValidation = (events: TripEvent[], curTime: Timestamp, timeSLA: number): boolean => {
  if (events.length < 2) {
    log.info('NO TRIP_END EVENT SEEN')
    return false
  }
  /* Process anything where the last event timestamp is more than 24 hours old */
  const latestTime = events[events.length - 1].timestamp
  if (latestTime + timeSLA > curTime) {
    log.info('TRIPS ENDED LESS THAN 24HRS AGO')
    return false
  }
  return true
}

export const createTelemetryMap = (events: TripEvent[], tripTelemetry: TripTelemetry[]): TripTelemetryField => {
  const telemetry: TripTelemetryField = {}
  if (tripTelemetry && tripTelemetry.length > 0) {
    events.reduce((start, end) => {
      const startTime = start.timestamp
      const endTime = end.timestamp
      /* Bin telemetry by events */
      const tripSegment = tripTelemetry.filter(
        telemetryPoint => telemetryPoint.timestamp >= startTime && telemetryPoint.timestamp < endTime
      )
      tripSegment.sort((a, b) => a.timestamp - b.timestamp)
      telemetry[startTime] = tripSegment
      return end
    })
    const lastEvent = tripTelemetry.filter(
      telemetryPoint => telemetryPoint.timestamp === events[events.length - 1].timestamp
    )
    telemetry[events[events.length - 1].timestamp] = lastEvent
  } else {
    throw new Error('TRIP TELEMETRY NOT FOUND')
  }
  return telemetry
}
