import db from '@mds-core/mds-db'
import { validateTelemetryDomainModel } from '@mds-core/mds-ingest-service'
import logger from '@mds-core/mds-logger'
import { isError } from '@mds-core/mds-service-helpers'
import { Telemetry, Timestamp, UUID } from '@mds-core/mds-types'
import { NotFoundError, now, ServerError, ValidationError } from '@mds-core/mds-utils'
import { AgencyApiSubmitVehicleTelemetryRequest, AgencyApiSubmitVehicleTelemetryResponse } from '../types'
import { agencyValidationErrorParser, writeTelemetry } from '../utils'

type TelemetryFailures = { telemetry: Object; reason: string }[]

/**
 *
 * @param options
 * @param options.data *UNVALIDATED* `Telemetry` data straight from the API (hence the Object[] type)
 * @param options.provider_id `provider_id` in question
 * @param options.recorded Recorded time
 * @returns Set with either all UUIDs for the provider, or the UUID of the telemetry point in question
 */
const getDeviceIdsForProvider = async ({
  data,
  provider_id,
  recorded
}: {
  data: Object[]
  provider_id: UUID
  recorded: Timestamp
}): Promise<Set<UUID>> => {
  /**
   * If there's only one point in the telemetry payload, we can avoid reading all device_ids for the provider,
   * and simply verify that the device in question is valid
   */
  if (data.length === 1) {
    const [nonValidatedTelemetry] = data

    const telemetry = validateTelemetryDomainModel({ ...nonValidatedTelemetry, provider_id, recorded })

    const { device_id } = telemetry

    const device = await db.readDevice(device_id, provider_id)

    // Set with only one entry
    return new Set<UUID>([device.device_id])
  }

  const deviceIdsWithProviderIds = await db.readDeviceIds(provider_id)

  // Turn array returned to a Set for fast lookups
  return new Set(deviceIdsWithProviderIds.map(({ device_id }) => device_id))
}

/**
 * @param options
 * @param options.data *UNVALIDATED* `Telemetry` data straight from the API (hence the Object[] type)
 * @param options.provider_id `provider_id` in question
 * @param options.recorded Recorded time
 * @returns Valid telemetry points & invalid telemetry points
 */
export const validateTelemetry = async ({
  data,
  provider_id,
  recorded
}: {
  data: Object[]
  provider_id: UUID
  recorded: Timestamp
}) => {
  const deviceIds = await getDeviceIdsForProvider({ data, provider_id, recorded })

  return data.reduce<{
    valid: Telemetry[]
    failures: TelemetryFailures
  }>(
    ({ valid, failures }, rawTelemetry) => {
      // Raw telemetry + provider_id (extracted from token) + recorded (generated at ingestion)
      const nonValidatedTelemetry = {
        ...rawTelemetry,
        provider_id,
        recorded
      }

      try {
        // Validate telemetry, and prune foreign properties
        const validatedTelemetry = validateTelemetryDomainModel(nonValidatedTelemetry)

        const { device_id } = validatedTelemetry

        if (!deviceIds.has(device_id))
          return {
            valid,
            failures: [...failures, { telemetry: validatedTelemetry, reason: `device_id: ${device_id} not found` }]
          }

        return { valid: [...valid, validatedTelemetry], failures }
      } catch (error) {
        if (error instanceof ValidationError) {
          const parsedError = agencyValidationErrorParser(error)

          return {
            valid,
            failures: [...failures, { telemetry: nonValidatedTelemetry, reason: parsedError.error_description }]
          }
        }

        /* we should never hit this */
        /* istanbul ignore next */
        throw error
      }
    },
    { valid: [], failures: [] }
  )
}

/**
 *
 * @param options
 * @param options.start Start time of telemetry query
 * @param options.provider_id MDS `provider_id`
 * @param options.data All telemetry provided in request
 * @param options.valid Telemetry which successfully validated
 * @param options.recorded_telemetry Telemetry which was successfully persisted
 *
 * Logs performance of telemetry validation + write
 */
const logTelemetryWritePerformance = ({
  start,
  provider_id,
  data,
  valid,
  recorded_telemetry
}: {
  start: Timestamp
  provider_id: UUID
  data: Object[]
  valid: Telemetry[]
  recorded_telemetry: Telemetry[]
}) => {
  const delta = Date.now() - start

  /* we ought not to hit this during our test suite */
  /* istanbul ignore next */
  if (delta > 300) {
    logger.info('writeTelemetry performance >.3s', {
      provider_id,
      validItems: valid.length,
      total: data.length,
      unique: recorded_telemetry.length,
      delta: `${delta} ms (${Math.round((1000 * valid.length) / delta)}/s)`
    })
  }
}

const allInvalidDataBody = (failures: TelemetryFailures) => ({
  error: 'invalid_data',
  error_description: 'None of the provided data was valid',
  error_details: failures
})

export const createTelemetryHandler = async (
  req: AgencyApiSubmitVehicleTelemetryRequest,
  res: AgencyApiSubmitVehicleTelemetryResponse
) => {
  const recorded = now()
  const start = now()

  const { provider_id } = res.locals
  const { data } = req.body

  if (!data) {
    return res.status(400).send({
      error: 'missing_param',
      error_description: 'A required parameter is missing.',
      error_details: ['data']
    })
  }

  try {
    const { valid, failures } = await validateTelemetry({ data, provider_id, recorded })

    if (valid.length) {
      const recorded_telemetry = await writeTelemetry(valid)

      logTelemetryWritePerformance({ start, provider_id, data, valid, recorded_telemetry })

      if (recorded_telemetry.length) {
        return res.status(200).send({
          success: valid.length,
          total: data.length,
          failures: failures.map(({ telemetry }) => telemetry)
        })
      }

      // None of the telemetry was persisted by the db (even though it passed schema validation), ergo, none of it was unique
      logger.info(`no unique telemetry in ${data.length} items for ${provider_id}`)
      return res.status(400).send(allInvalidDataBody(failures))
    }

    // None of the telemetry passed validation
    const body = `${JSON.stringify(req.body).substring(0, 128)} ...`
    const fails = `${JSON.stringify(failures).substring(0, 128)} ...`
    logger.info(`no valid telemetry in ${data.length} items for ${provider_id}`, { body, fails })

    return res.status(400).send(allInvalidDataBody(failures))
  } catch (err) {
    if (isError(err, NotFoundError)) {
      /**
       * TODO: as of MDS v1.1 this is what we should be sending, but we're on 1.0 for now
       */
      // return res.status(400).send({
      //   error: 'unregistered',
      //   error_description: 'Some of the devices are unregistered',
      //   error_details: [data[0].device_id]
      // })

      return res.status(400).send({
        error: 'invalid_data',
        error_description: 'None of the provided data was valid.',
        error_details: [`device: ${data[0].device_id} not found`]
      })
    }

    if (isError(err, ValidationError)) return res.status(400).send(agencyValidationErrorParser(err))

    logger.error('createTelemetryHandler fatal error', { error: err })
    return res.status(500).send({ error: new ServerError() })
  }
}
