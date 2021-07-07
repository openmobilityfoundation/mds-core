import cache from '@mds-core/mds-agency-cache'
import db from '@mds-core/mds-db'
import { validateEventDomainModel } from '@mds-core/mds-ingest-service'
import logger from '@mds-core/mds-logger'
import { providerName } from '@mds-core/mds-providers'
import stream from '@mds-core/mds-stream'
import { Device, UUID, VehicleEvent } from '@mds-core/mds-types'
import { normalizeToArray, now, ValidationError } from '@mds-core/mds-utils'
import { AgencyApiSubmitVehicleEventRequest, AgencyApiSubmitVehicleEventResponse, AgencyServerError } from '../types'
import { agencyValidationErrorParser, eventValidForMode } from '../utils'

const handleDbError = async (
  req: AgencyApiSubmitVehicleEventRequest,
  res: AgencyApiSubmitVehicleEventResponse,
  err: Error | Partial<{ message: string }>,
  provider_id: UUID,
  event: Partial<VehicleEvent>
): Promise<void> => {
  const name = providerName(provider_id || 'unknown')

  const message = err.message || String(err)

  await stream.writeEventError({
    provider_id,
    data: event,
    recorded: now(),
    error_message: message
  })

  if (message.includes('duplicate')) {
    logger.info('duplicate event', { name, event })
    res.status(400).send({
      error: 'bad_param',
      error_description: 'An event with this device_id and timestamp has already been received'
    })
  } else if (message.includes('not found') || message.includes('unregistered')) {
    logger.info('event for unregistered', { name, event })
    res.status(400).send({
      error: 'unregistered',
      error_description: 'The specified device_id has not been registered'
    })
  } else {
    logger.error('post event fail:', { event, message })
    res.status(500).send(AgencyServerError)
  }
}

/**
 * Logs performance of write if the duration of the write was > deltaThreshold
 * @param event VehicleEvent which was persisted
 * @param deltaThreshold Delta (in ms) to log for (default 100ms)
 */
const logEventWritePerformance = (event: VehicleEvent, logThreshold = 100) => {
  const { recorded } = event
  const delta = now() - recorded

  /* Tests shouldn't be slow */
  /* istanbul ignore next */
  if (delta > logThreshold) {
    const { provider_id } = event
    const name = providerName(provider_id || 'unknown')

    logger.info(`${name} post event took ${delta} ms`)
  }
}

const sendSuccess = (
  req: AgencyApiSubmitVehicleEventRequest,
  res: AgencyApiSubmitVehicleEventResponse,
  event: VehicleEvent
) => {
  const { device_id, vehicle_state } = event

  logEventWritePerformance(event)

  return res.status(201).send({
    device_id,
    state: vehicle_state
  })
}

/**
 * Refreshes the cache if a device was previously registered, but was removed from the cache due to decommissioning
 * @param device MDS Device
 * @param event MDS VehicleEvent
 */
const refreshDeviceCache = async (device: Device, event: VehicleEvent) => {
  try {
    await cache.readDevice(event.device_id)
  } catch (err) {
    try {
      await Promise.all([cache.writeDevice(device), stream.writeDevice(device)])
      logger.info('Re-adding previously deregistered device to cache', err)
    } catch (error) {
      logger.warn(`Error writing to cache/stream ${error}`)
    }
  }
}

export const createEventHandler = async (
  req: AgencyApiSubmitVehicleEventRequest,
  res: AgencyApiSubmitVehicleEventResponse
) => {
  const { device_id } = req.params

  const { provider_id } = res.locals

  const recorded = now()

  const unparsedEvent = {
    ...req.body,
    device_id,
    provider_id,
    recorded
  }

  try {
    const event = (() => {
      const parsedEvent = validateEventDomainModel(unparsedEvent)

      const { telemetry, device_id, recorded } = parsedEvent
      const { timestamp: telemetry_timestamp } = telemetry

      return { ...parsedEvent, telemetry_timestamp, telemetry: { ...telemetry, device_id, recorded } }
    })()

    // TODO switch to cache for speed?
    const device = await db.readDevice(device_id, provider_id)

    // Note: Even though the event has passed schema validation, we need to verify it's allowed for this mode of vehicle
    const invalidStateOrEventTypes = eventValidForMode(device, event)
    if (invalidStateOrEventTypes) {
      return res.status(400).send(invalidStateOrEventTypes)
    }

    await refreshDeviceCache(device, event)

    const { telemetry } = event
    if (telemetry) {
      await db.writeTelemetry(normalizeToArray(telemetry))
    }

    // database write is crucial; failures of cache/stream should be noted and repaired
    const recorded_event = await db.writeEvent(event)

    try {
      await Promise.all([
        cache.writeEvent(recorded_event),
        stream.writeEvent(recorded_event),
        cache.writeTelemetry([telemetry]),
        stream.writeTelemetry([telemetry])
      ])
    } catch (err) {
      logger.warn('/event exception cache/stream', err)
    } finally {
      return sendSuccess(req, res, event)
    }
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).send(agencyValidationErrorParser(err))

    await handleDbError(req, res, err, provider_id, unparsedEvent)
  }
}
