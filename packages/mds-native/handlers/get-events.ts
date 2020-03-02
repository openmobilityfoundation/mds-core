import { Recorded, VehicleEvent, UUID, Timestamp } from '@mds-core/mds-types'
import { isValidNumber, isValidProviderId, isValidDeviceId, isValidTimestamp } from '@mds-core/mds-schema-validators'
import { ValidationError } from '@mds-core/mds-utils'
import db from '@mds-core/mds-db'
import logger from '@mds-core/mds-logger'
import { NativeApiRequest, NativeApiResponse } from '../types'
import { InternalServerError } from './utils'

interface GetEventsRequest extends NativeApiRequest<{ cursor: string }> {
  // Query string parameters always come in as strings
  query: Partial<
    {
      [P in 'limit' | 'device_id' | 'provider_id' | 'start_time' | 'end_time']: string
    }
  >
}

type GetEventsResponse = NativeApiResponse<{
  events: Omit<Recorded<VehicleEvent>, 'id' | 'service_area_id'>[]
  cursor: string
}>

type NativeApiGetEventsCursor = Partial<{
  provider_id: UUID
  device_id: UUID
  start_time: Timestamp
  end_time: Timestamp
  last_id: number
}>

const numericQueryStringParam = (param: string | undefined): number | undefined => (param ? Number(param) : undefined)

const getRequestParameters = (req: GetEventsRequest): { cursor: NativeApiGetEventsCursor; limit: number } => {
  const {
    params: { cursor },
    query: { limit: query_limit, ...filters }
  } = req
  const limit = numericQueryStringParam(query_limit) || 1000
  isValidNumber(limit, { required: false, min: 1, max: 1000, property: 'limit' })
  if (cursor) {
    if (Object.keys(filters).length > 0) {
      throw new ValidationError('unexpected_filters', { cursor, filters })
    }
    try {
      return { cursor: JSON.parse(Buffer.from(cursor, 'base64').toString('ascii')), limit }
    } catch (err) {
      throw new ValidationError('invalid_cursor', { cursor })
    }
  } else {
    const { provider_id, device_id, start_time: query_start_time, end_time: query_end_time } = filters
    const start_time = numericQueryStringParam(query_start_time)
    const end_time = numericQueryStringParam(query_end_time)
    isValidProviderId(provider_id, { required: false })
    isValidDeviceId(device_id, { required: false })
    isValidTimestamp(start_time, { required: false })
    isValidTimestamp(end_time, { required: false })
    return { cursor: { provider_id, device_id, start_time, end_time }, limit }
  }
}

export const GetEventsHandler = async (req: GetEventsRequest, res: GetEventsResponse) => {
  try {
    const { cursor, limit } = getRequestParameters(req)
    const events = await db.readEventsWithTelemetry({ ...cursor, limit })
    return res.status(200).send({
      version: res.locals.version,
      cursor: Buffer.from(
        JSON.stringify({
          ...cursor,
          last_id: events.length === 0 ? cursor.last_id : events[events.length - 1].id
        })
      ).toString('base64'),
      events: events.map(({ id, service_area_id, event_type_reason, ...event }) => ({
        ...event,
        event_type_reason: event_type_reason || null
      }))
    })
  } catch (err) {
    if (err instanceof ValidationError) {
      await logger.warn(req.method, req.originalUrl, err)
      return res.status(400).send({ error: err })
    }
    /* istanbul ignore next */
    return InternalServerError(req, res, err)
  }
}
