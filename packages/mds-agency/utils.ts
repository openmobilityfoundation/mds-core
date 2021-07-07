/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cache from '@mds-core/mds-agency-cache'
import db from '@mds-core/mds-db'
import logger from '@mds-core/mds-logger'
import stream from '@mds-core/mds-stream'
import {
  BoundingBox,
  Device,
  MICRO_MOBILITY_VEHICLE_EVENT,
  MICRO_MOBILITY_VEHICLE_EVENTS,
  MICRO_MOBILITY_VEHICLE_STATE,
  MICRO_MOBILITY_VEHICLE_STATES,
  TAXI_TRIP_EXIT_EVENTS,
  TAXI_VEHICLE_EVENT,
  TAXI_VEHICLE_EVENTS,
  TAXI_VEHICLE_STATE,
  TAXI_VEHICLE_STATES,
  Telemetry,
  TNC_TRIP_EXIT_EVENTS,
  TNC_VEHICLE_EVENT,
  TNC_VEHICLE_STATE,
  TRIP_STATE,
  TRIP_STATES,
  UUID,
  VehicleEvent,
  VEHICLE_STATE
} from '@mds-core/mds-types'
import { areThereCommonElements, isInsideBoundingBox, isUUID, ValidationError } from '@mds-core/mds-utils'
import { DefinedError } from 'ajv'
import express from 'express'
import { Query } from 'express-serve-static-core'
import { AgencyApiError, CompositeVehicle, PaginatedVehiclesList, TelemetryResult, VehiclePayload } from './types'

/**
 *
 * @param error ValidationError to parse
 * @returns Error formatted in accordance with the [MDS-Agency spec](https://github.com/openmobilityfoundation/mobility-data-specification/tree/main/agency#vehicle---register)
 *
 * Note: It is assumed that these errors are typically emitted from AJV, and they are parsed accordingly. All non-AJV based validation errors will result in loose error emission.
 */
export const agencyValidationErrorParser = (error: ValidationError): AgencyApiError => {
  // Not the best typeguard in the world, but ¯\_(ツ)_/¯
  const isAjvErrors = (x: unknown): x is DefinedError[] => {
    return Array.isArray(x)
  }

  const { info } = error

  if (isAjvErrors(info)) {
    const [{ keyword }] = info

    /**
     * If the first error we see is a missing property, then only report missing property errors.
     */
    if (keyword === 'required') {
      // See MDS-Agency spec
      const error = 'missing_param'
      const error_description = 'A required parameter is missing.'

      // Report all missing properties, ignore other errors
      const error_details = info.reduce<string[]>((acc, subErr) => {
        const { params } = subErr

        if ('missingProperty' in params) {
          const { missingProperty } = params
          return [...acc, missingProperty]
        }

        return acc
      }, [])

      return { error, error_description, error_details }
    }

    // If the error is something other than a missing param error...
    const error = 'bad_param'
    const error_description = 'A validation error occurred.'
    const error_details = info.reduce<{ property: string; message: string | undefined }[]>((acc, subErr) => {
      const { instancePath, message } = subErr

      const property = instancePath.replace(/\W|[0-9]/g, '')

      return [...acc, { property, message }]
    }, [])

    return { error, error_description, error_details }
  }

  logger.error('agencyErrorParser unmatched error', error)
  return { error: 'bad_param', error_description: 'A validation error occurred.', error_details: { error } }
}

export async function getVehicles(
  skip: number,
  take: number,
  url: string,
  reqQuery: Query,
  provider_id?: string,
  bbox?: BoundingBox
): Promise<PaginatedVehiclesList> {
  function fmt(query: { skip: number; take: number }): string {
    const flat: { [key: string]: number } = { ...reqQuery, ...query }
    let s = `${url}?`
    s += Object.keys(flat)
      .map(key => `${key}=${flat[key]}`)
      .join('&')
    return s
  }

  const rows = await db.readDeviceIds(provider_id)
  const total = rows.length
  logger.info(`read ${total} deviceIds in /vehicles`)

  const events = rows.length > 0 ? await cache.readEvents(rows.map(record => record.device_id)) : []
  const eventMap: { [s: string]: VehicleEvent } = {}
  events.map(event => {
    if (event) {
      eventMap[event.device_id] = event
    }
  })

  const deviceIdSuperset = bbox
    ? rows.filter(record => {
        return eventMap[record.device_id] ? isInsideBoundingBox(eventMap[record.device_id].telemetry, bbox) : true
      })
    : rows

  const deviceIdSubset = deviceIdSuperset.slice(skip, skip + take).map(record => record.device_id)
  const devices = (await db.readDeviceList(deviceIdSubset)).reduce((acc: Device[], device: Device) => {
    if (!device) {
      throw new Error('device in DB but not in cache')
    }
    const event = eventMap[device.device_id]
    const state: VEHICLE_STATE = event ? event.vehicle_state : 'removed'
    const telemetry = event ? event.telemetry : null
    const updated = event ? event.timestamp : null
    return [...acc, { ...device, state, telemetry, updated }]
  }, [])

  const noNext = skip + take >= deviceIdSuperset.length
  const noPrev = skip === 0 || skip > deviceIdSuperset.length
  const lastSkip = take * Math.floor(deviceIdSuperset.length / take)

  return {
    total,
    links: {
      first: fmt({
        skip: 0,
        take
      }),
      last: fmt({
        skip: lastSkip,
        take
      }),
      prev: noPrev
        ? null
        : fmt({
            skip: skip - take,
            take
          }),
      next: noNext
        ? null
        : fmt({
            skip: skip + take,
            take
          })
    },
    vehicles: devices
  }
}

/**
 *
 * @param param0 Some object containing a modality (e.g. `Device`)
 * @param event MDS Event
 * @returns Error if applicable, null otherwise.
 */
export function eventValidForMode({ modality }: Pick<Device, 'modality'>, event: VehicleEvent) {
  switch (modality) {
    case 'micromobility': {
      for (const event_type of event.event_types) {
        if (!MICRO_MOBILITY_VEHICLE_EVENTS.includes(event_type as MICRO_MOBILITY_VEHICLE_EVENT))
          return { error: 'bad_param', error_description: `invalid event_type in event_types ${event_type}` }
      }

      if (!MICRO_MOBILITY_VEHICLE_STATES.includes(event.vehicle_state as MICRO_MOBILITY_VEHICLE_STATE)) {
        return { error: 'bad_param', error_description: `invalid vehicle_state ${event.vehicle_state}` }
      }

      break
    }
    case 'taxi': {
      for (const event_type of event.event_types) {
        if (!TAXI_VEHICLE_EVENTS.includes(event_type as TAXI_VEHICLE_EVENT))
          return { error: 'bad_param', error_description: `invalid event_type in event_types ${event_type}` }
      }

      if (!TAXI_VEHICLE_STATES.includes(event.vehicle_state as TAXI_VEHICLE_STATE)) {
        return { error: 'bad_param', error_description: `invalid vehicle_state ${event.vehicle_state}` }
      }

      if (
        event.trip_id &&
        TRIP_STATES.includes(event.vehicle_state as TRIP_STATE) &&
        !areThereCommonElements(TAXI_TRIP_EXIT_EVENTS, event.event_types)
      ) {
        if (!event.trip_state) {
          return {
            error: 'missing_param',
            error_description: `missing enum field "trip_state" required on trip events`
          }
        }

        if (event.trip_state && !TRIP_STATES.includes(event.trip_state)) {
          return { error: 'bad_param', error_description: `invalid trip_state ${event.trip_state}` }
        }
      }

      break
    }
    case 'tnc':
      {
        for (const event_type of event.event_types) {
          if (!TNC_VEHICLE_EVENT.includes(event_type as TNC_VEHICLE_EVENT))
            return { error: 'bad_param', error_description: `invalid event_type in event_types ${event_type}` }
        }

        if (!TNC_VEHICLE_STATE.includes(event.vehicle_state as TNC_VEHICLE_STATE)) {
          return { error: 'bad_param', error_description: `invalid vehicle_state ${event.vehicle_state}` }
        }

        if (
          event.trip_id &&
          TRIP_STATES.includes(event.vehicle_state as TRIP_STATE) &&
          !areThereCommonElements(TNC_TRIP_EXIT_EVENTS, event.event_types)
        ) {
          if (!event.trip_state) {
            return {
              error: 'missing_param',
              error_description: `missing enum field "trip_state" required on trip events`
            }
          }

          if (event.trip_state && !TRIP_STATES.includes(event.trip_state)) {
            return { error: 'bad_param', error_description: `invalid trip_state ${event.trip_state}` }
          }
        }
      }

      break
  }

  return null
}

export async function writeTelemetry(telemetry: Telemetry | Telemetry[]) {
  const recorded_telemetry = await db.writeTelemetry(Array.isArray(telemetry) ? telemetry : [telemetry])
  try {
    await Promise.all([cache.writeTelemetry(recorded_telemetry), stream.writeTelemetry(recorded_telemetry)])
  } catch (err) {
    logger.warn(`Failed to write telemetry to cache/stream, ${err}`)
  }
  return recorded_telemetry
}

export async function refresh(device_id: UUID, provider_id: UUID): Promise<string> {
  // TODO all of this back and forth between cache and db is slow
  const device = await db.readDevice(device_id, provider_id)
  // logger.info('refresh device', device)
  await cache.writeDevice(device)
  try {
    const event = await db.readEvent(device_id)
    await cache.writeEvent(event)
  } catch (error) {
    logger.info('no events for', { device_id, error })
  }
  try {
    await db.readTelemetry(device_id)
  } catch (error) {
    logger.info('no telemetry for', { device_id, error })
  }
  return 'done'
}

/**
 * for some functions we will want to validate the :device_id param
 */
export async function validateDeviceId(req: express.Request, res: express.Response, next: Function) {
  const { device_id } = req.params

  /* istanbul ignore if This is never called with no device_id parameter */
  if (!device_id) {
    logger.warn('agency: missing device_id', { originalUrl: req.originalUrl })
    res.status(400).send({
      error: 'missing_param',
      error_description: 'missing device_id'
    })
    return
  }
  if (device_id && !isUUID(device_id)) {
    res.status(400).send({
      error: 'bad_param',
      error_description: 'A validation error occurred.',
      error_details: [{ property: 'device_id', reason: 'Must be a UUID' }]
    })
    return
  }
  next()
}

export function computeCompositeVehicleData(payload: VehiclePayload) {
  const { device, event, telemetry } = payload

  const composite: CompositeVehicle = {
    ...device
  }

  if (event) {
    composite.prev_events = event.event_types
    composite.updated = event.timestamp
    composite.state = event.vehicle_state
  } else {
    composite.state = 'removed'
    composite.prev_events = ['decommissioned']
  }
  if (telemetry) {
    if (telemetry.gps) {
      composite.gps = telemetry.gps
    }
  }
  return composite
}

const normalizeTelemetry = (telemetry: TelemetryResult) => {
  if (Array.isArray(telemetry)) {
    return telemetry[0]
  }
  return telemetry
}

export async function readPayload(device_id: UUID): Promise<VehiclePayload> {
  const payload: VehiclePayload = {}
  try {
    payload.device = await db.readDevice(device_id)
  } catch (err) {
    logger.error(err)
  }
  try {
    payload.event = await cache.readEvent(device_id)
    if (payload.event) {
      if (payload.event.telemetry) {
        payload.telemetry = normalizeTelemetry(payload.event.telemetry)
      }
    }
  } catch (err) {
    logger.error(err)
  }
  return payload
}
