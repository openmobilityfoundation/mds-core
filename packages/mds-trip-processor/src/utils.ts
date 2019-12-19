import { TripEvent, TripsTelemetry, TripTelemetry, Timestamp, UUID } from '@mds-core/mds-types'
import log from '@mds-core/mds-logger'
import config from './config'

export const eventValidation = (events: TripEvent[], curTime: Timestamp): boolean => {
  if (events.length < 2) {
    log.info('NO TRIP_END EVENT SEEN')
    return false
  }
  // Process anything where the last event timestamp is more than 24 hours old
  const timeSLA = config.compliance_sla.max_telemetry_time
  const latestTime = events[events.length - 1].timestamp
  if (latestTime + timeSLA > curTime) {
    log.info('TRIPS ENDED LESS THAN 24HRS AGO')
    return false
  }
  return true
}

export const createTelemetryMap = (events: TripEvent[], tripMap: TripsTelemetry, trip_id: UUID): TripTelemetry[][] => {
  const tripTelemetry = tripMap[trip_id]
  const telemetry: TripTelemetry[][] = []
  if (tripTelemetry && tripTelemetry.length > 0) {
    for (let i = 0; i < events.length - 1; i++) {
      const start_time = events[i].timestamp
      const end_time = events[i + 1].timestamp
      // Bin telemetry by events
      const tripSegment = tripTelemetry.filter(
        telemetry_point => telemetry_point.timestamp >= start_time && telemetry_point.timestamp < end_time
      )
      tripSegment.sort((a, b) => a.timestamp - b.timestamp)
      telemetry.push(tripSegment)
    }
    const lastEvent = tripTelemetry.filter(
      telemetry_point => telemetry_point.timestamp === events[events.length - 1].timestamp
    )
    telemetry.push(lastEvent)
  } else {
    throw new Error('TRIP TELEMETRY NOT FOUND')
  }
  return telemetry
}
