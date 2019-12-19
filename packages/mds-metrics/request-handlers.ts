import db from '@mds-core/mds-db'
import { inc, RuntimeError, ServerError, isUUID, BadParamsError, parseRelative } from '@mds-core/mds-utils'
import { EVENT_STATUS_MAP, VEHICLE_TYPES, UUID, VEHICLE_TYPE } from '@mds-core/mds-types'
import { Parser } from 'json2csv'
import fs from 'fs'

import log from '@mds-core/mds-logger'
import {
  MetricsApiRequest,
  instantiateEventSnapshotResponse,
  instantiateStateSnapshotResponse,
  GetStateSnapshotResponse,
  GetEventsSnapshotResponse,
  GetTelemetryCountsResponse,
  GetEventCountsResponse,
  TelemetryCountsResponse,
  StateSnapshot,
  EventSnapshot,
  GetAllResponse
} from './types'
import { getTimeBins, normalizeToArray, getBinSize } from './utils'

export async function getStateSnapshot(req: MetricsApiRequest, res: GetStateSnapshotResponse) {
  const { body } = req
  const { provider_id } = body
  const slices = getTimeBins(body)

  try {
    const device_ids = (await db.readDeviceIds(provider_id)).map(device => device.device_id)
    const devices = await db.readDeviceList(device_ids)

    log.info(`Fetched ${devices.length} devices from db`)

    const eventsBySlice = await Promise.all(
      slices.map(slice => {
        const { end } = slice
        return db.readHistoricalEvents({ end_date: end })
      })
    )

    log.info(`Fetched ${eventsBySlice.length} event snapshots from db`)
    log.info(`First event slice has ${eventsBySlice[0].length} events`)
    log.info(`Last event slice has ${eventsBySlice[eventsBySlice.length - 1].length} events`)

    const result = eventsBySlice
      .map(events => {
        if (events) {
          const statusCounts = events.reduce((acc, event) => {
            const { event_type, device_id } = event
            const status = EVENT_STATUS_MAP[event_type]

            const { type } = devices.find(d => {
              return d.device_id === device_id
            }) || { type: undefined }

            if (type === undefined) {
              throw new RuntimeError(`Could not find corresponding device ${device_id} for event ${event}!`)
            }

            const incrementedSubAcc = { [type]: inc(acc[type], status) }
            return { ...acc, ...incrementedSubAcc }
          }, instantiateStateSnapshotResponse(0))

          log.info(`Snapshot: ${statusCounts}`)
          return statusCounts
        }
      })
      .filter((e): e is StateSnapshot => e !== undefined)

    const resultWithSlices = result.map((snapshot, idx) => {
      const slice = slices[idx]
      return { snapshot, slice }
    })

    log.info(`state_snapshot result: ${resultWithSlices}`)

    res.status(200).send(resultWithSlices)
  } catch (error) {
    await log.error(error)
    res.status(500).send(new ServerError())
  }
}

export async function getEventSnapshot(req: MetricsApiRequest, res: GetEventsSnapshotResponse) {
  const { body } = req
  const { provider_id } = body
  const slices = getTimeBins(body)

  try {
    const device_ids = (await db.readDeviceIds(provider_id)).map(device => device.device_id)
    const devices = await db.readDeviceList(device_ids)

    log.info(`Fetched ${devices.length} devices from db`)

    const eventsBySlice = await Promise.all(
      slices.map(slice => {
        const { end } = slice
        return db.readHistoricalEvents({ end_date: end })
      })
    )

    log.info(`Fetched ${eventsBySlice.length} event snapshots from db`)
    log.info(`First event slice has ${eventsBySlice[0].length} events`)
    log.info(`Last event slice has ${eventsBySlice[eventsBySlice.length - 1].length} events`)

    const result = eventsBySlice
      .map(events => {
        if (events) {
          const eventCounts = events.reduce((acc, event) => {
            const { event_type, device_id } = event

            const { type } = devices.find(d => {
              return d.device_id === device_id
            }) || { type: undefined }

            if (type === undefined) {
              throw new RuntimeError(`Could not find corresponding device ${device_id} for event ${event}!`)
            }

            const incrementedSubAcc = { [type]: inc(acc[type], event_type) }

            return { ...acc, incrementedSubAcc }
          }, instantiateEventSnapshotResponse(0))

          log.info(`Snapshot: ${eventCounts}`)

          return eventCounts
        }
      })
      .filter((e): e is EventSnapshot => e !== undefined)

    const resultWithSlices = result.map((snapshot, idx) => {
      const slice = slices[idx]
      return { snapshot, slice }
    })

    log.info(`event_snapshot result: ${resultWithSlices}`)

    res.status(200).send(resultWithSlices)
  } catch (error) {
    await log.error(error)
    res.status(500).send(new ServerError())
  }
}

export async function getTelemetryCounts(req: MetricsApiRequest, res: GetTelemetryCountsResponse) {
  const { body } = req
  const slices = getTimeBins(body)

  try {
    const telemetryCounts = await Promise.all(
      slices.map(slice => {
        const { start, end } = slice
        return db.getTelemetryCountsPerProviderSince(start, end)
      })
    )

    const telemetryCountsWithTimeSlices: TelemetryCountsResponse[] = telemetryCounts.map((telemetryCount, idx) => {
      const slice = slices[idx]
      return { telemetryCount, slice }
    })

    res.status(200).send(telemetryCountsWithTimeSlices)
  } catch (error) {
    await log.error(error)
    res.status(500).send(new ServerError())
  }
}

export async function getEventCounts(req: MetricsApiRequest, res: GetEventCountsResponse) {
  const { body } = req
  const slices = getTimeBins(body)

  try {
    const eventCounts = await Promise.all(
      slices.map(slice => {
        const { start, end } = slice
        return db.getEventCountsPerProviderSince(start, end)
      })
    )

    const eventCountsWithTimeSlice = eventCounts.map((eventCount, idx) => {
      const slice = slices[idx]
      return { eventCount, slice }
    })

    res.status(200).send(eventCountsWithTimeSlice)
  } catch (error) {
    await log.error(error)
    res.status(500).send(new ServerError(error))
  }
}

/*
  This method simply returns the time-binned metrics table rows with some basic querying.

  This method is a stopgap so the FE has something to display.

  It is scheduled to be replaced with methods that have better querying support
  and finer-grained field-fetching a la GraphQL.

  **Note: unlike the above methods, this method exclusively uses URL query params**
*/

export async function getAll(req: MetricsApiRequest, res: GetAllResponse) {
  const { query } = req
  const bin_size = getBinSize(query.bin_size)

  const { start_time, end_time } = parseRelative(query.start || 'today', query.end || 'now')
  const slices = bin_size
    .map(currBinSize => {
      return getTimeBins({
        bin_size: currBinSize,
        start_time,
        end_time
      })
    })
    .reduce((prevSlices, currSlices) => {
      return prevSlices.concat(currSlices)
    }, [])
  const provider_ids = normalizeToArray<UUID>(query.provider_id)
  const vehicle_types = normalizeToArray<VEHICLE_TYPE>(query.vehicle_type)
  const format: string | 'json' | 'tsv' = query.format || 'json'

  if (format !== 'json' && format !== 'tsv') {
    return res.status(400).send(new BadParamsError(`Bad format query param: ${format}`))
  }

  for (const currProviderId of provider_ids) {
    if (!isUUID(currProviderId)) {
      return res.status(400).send(new BadParamsError(`provider_id ${currProviderId} is not a UUID`))
    }
  }

  for (const currVehicleType of vehicle_types) {
    if (!Object.values(VEHICLE_TYPES).includes(currVehicleType)) {
      return res.status(400).send(new BadParamsError(`vehicle_type ${currVehicleType} is not a valid vehicle type`))
    }
  }

  try {
    if (format === 'json') {
      const bucketedMetrics = await Promise.all(
        slices.map(slice => {
          const { start, end } = slice
          return db.getAllMetrics({
            start_time: start,
            end_time: end,
            geography_id: null,
            provider_ids,
            vehicle_types
          })
        })
      )

      const bucketedMetricsWithTimeSlice = bucketedMetrics.map((bucketedMetricsRow, idx) => {
        const slice = slices[idx]
        return { data: bucketedMetricsRow, ...slice }
      })

      return res.status(200).send(bucketedMetricsWithTimeSlice)
    }
    if (format === 'tsv') {
      const parser = new Parser({
        delimiter: '\t'
      })
      const metricsRows = await db.getAllMetrics({
        start_time,
        end_time,
        geography_id: null,
        provider_ids,
        vehicle_types
      })
      const metricsRowsTsv = parser.parse(metricsRows)

      return res.status(200).send(metricsRowsTsv)
    }
    // We should never fall out to this case
    return res.status(500).send(new ServerError('Unexpected error'))
  } catch (error) {
    await log.error(error)
    res.status(500).send(new ServerError(error))
  }
}

export async function getAllStubbed(req: MetricsApiRequest, res: GetAllResponse) {
  const { query } = req
  // const bin_size = getBinSizeFromQuery(query)

  // const { start_time, end_time } = parseRelative(query.start || 'today', query.end || 'now')
  // const slices = getTimeBins({
  //   bin_size,
  //   start_time,
  //   end_time
  // })
  const provider_id = query.provider_id || null
  const vehicle_type = query.vehicle_type || null
  const format: string | 'json' | 'tsv' = query.format || 'json'

  if (format !== 'json' && format !== 'tsv') {
    return res.status(400).send(new BadParamsError(`Bad format query param: ${format}`))
  }

  if (provider_id !== null && !isUUID(provider_id))
    return res.status(400).send(new BadParamsError(`provider_id ${provider_id} is not a UUID`))

  // TODO test validation
  if (vehicle_type !== null && !Object.values(VEHICLE_TYPES).includes(vehicle_type))
    return res.status(400).send(new BadParamsError(`vehicle_type ${vehicle_type} is not a valid vehicle type`))

  const tsvStub = fs.readFileSync('./metrics-sample-v1.tsv').toString()
  return res.status(200).send(tsvStub)
}
