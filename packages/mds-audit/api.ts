/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import express from 'express'
import uuid from 'uuid'
import log from '@mds-core/mds-logger'
import urls from 'url'
import {
  pathsFor,
  seconds,
  isValidAuditDeviceId,
  isValidAuditEventId,
  isValidAuditEventType,
  isValidAuditTripId,
  isValidProviderId,
  isValidProviderVehicleId,
  isValidTelemetry,
  isValidTimestamp,
  isValidVehicleEventType,
  isValidAuditIssueCode,
  isValidAuditNote,
  ValidationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ServerError
} from '@mds-core/mds-utils'
import { providerName } from '@mds-core/mds-providers' // map of uuids -> obj
import { AUDIT_EVENT_TYPES, AuditEvent, TelemetryData, Timestamp, Telemetry, AuditDetails } from '@mds-core/mds-types'
import { asPagingParams, asJsonApiLinks } from '@mds-core/mds-api-helpers'
import { checkScope } from '@mds-core/mds-api-server'
import {
  AuditApiAuditEndRequest,
  AuditApiAuditNoteRequest,
  AuditApiAuditStartRequest,
  AuditApiGetTripRequest,
  AuditApiGetTripsRequest,
  AuditApiRequest,
  AuditApiResponse,
  AuditApiTripRequest,
  AuditApiVehicleEventRequest,
  AuditApiVehicleTelemetryRequest
} from './types'
import {
  deleteAudit,
  readAudit,
  readAuditEvents,
  readAudits,
  readDevice,
  readDeviceByVehicleId,
  readEvents,
  readTelemetry,
  withGpsProperty,
  writeAudit,
  writeAuditEvent,
  getVehicles
} from './service'

// TODO lib
function flattenTelemetry(telemetry?: Telemetry): TelemetryData {
  return telemetry
    ? {
        ...telemetry.gps,
        charge: telemetry.charge
      }
    : {
        lat: 0,
        lng: 0,
        speed: null,
        heading: null,
        accuracy: null,
        altitude: null,
        charge: null
      }
}

function api(app: express.Express): express.Express {
  /**
   * Audit-specific middleware to extract subject_id into locals, do some logging, etc.
   * NOTE that audit will be city-facing only, not Providers.
   */
  app.use(async (req: AuditApiRequest, res: AuditApiResponse, next) => {
    // CORS, because we are webby, not machine-to-machine
    res.header('Access-Control-Allow-Origin', '*')

    /* istanbul ignore if */
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, DELETE')
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
      // 200 OK
      return res.sendStatus(200)
    }
    if (!(req.path.includes('/health') || req.path === '/')) {
      if (res.locals.claims) {
        // verify presence of subject_id
        const { principalId, user_email } = res.locals.claims
        const subject_id = user_email || principalId

        /* istanbul ignore if */
        if (subject_id) {
          // stash audit_subject_id and timestamp (for recording db writes)
          res.locals.audit_subject_id = subject_id
          res.locals.recorded = Date.now()
          log.info(subject_id, req.method, req.originalUrl)
          return next()
        }
      }
      await log.warn('Missing subject_id', req.method, req.originalUrl)
      // 403 Forbidden
      return res.status(403).send({ error: new AuthorizationError('missing_subject_id') })
    }
    next()
  })

  /**
   * Audit middleware to load the audit into locals using the audit_trip_id
   */
  app.use(pathsFor('/trips/:audit_trip_id'), async (req: AuditApiTripRequest, res: AuditApiResponse, next) => {
    try {
      const { audit_trip_id } = req.params
      if (isValidAuditTripId(audit_trip_id)) {
        res.locals.audit_trip_id = audit_trip_id
        res.locals.audit = await readAudit(audit_trip_id)
      }
      next()
    } catch (err) /* istanbul ignore next */ {
      if (err instanceof ValidationError) {
        // 400 Bad Request
        res.status(400).send({ error: err })
      } else {
        // 500 Internal Server Error
        await log.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
        res.status(500).send({ error: new ServerError(err) })
      }
    }
  })

  // /////////////////// begin audit-only endpoints //////////////////////

  /**
   * initiate an audit
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   */
  app.post(
    pathsFor('/trips/:audit_trip_id/start'),
    checkScope(check => check('audits:write')),
    async (req: AuditApiAuditStartRequest, res: AuditApiResponse) => {
      try {
        const { audit_trip_id, audit, audit_subject_id, recorded } = res.locals

        if (!audit) {
          const {
            timestamp,
            provider_id,
            provider_vehicle_id,
            audit_event_id = uuid(),
            audit_device_id,
            telemetry
          } = req.body

          // Validate input params
          if (
            isValidTimestamp(timestamp) &&
            isValidProviderId(provider_id) &&
            isValidProviderVehicleId(provider_vehicle_id) &&
            isValidAuditEventId(audit_event_id) &&
            isValidAuditDeviceId(audit_device_id) &&
            isValidTelemetry(telemetry, { required: false })
          ) {
            // Find provider device by vehicle id lookup
            const provider_device = await readDeviceByVehicleId(provider_id, provider_vehicle_id)
            const provider_device_id = provider_device ? provider_device.device_id : null
            const provider_name = providerName(provider_id)

            // Create the audit
            await writeAudit({
              audit_trip_id,
              audit_device_id,
              audit_subject_id,
              provider_id,
              provider_name,
              provider_vehicle_id,
              provider_device_id,
              timestamp,
              recorded
            })

            // Create the audit start event
            await writeAuditEvent({
              audit_trip_id,
              audit_event_id,
              audit_subject_id,
              audit_event_type: AUDIT_EVENT_TYPES.start,
              ...flattenTelemetry(telemetry),
              timestamp,
              recorded
            })

            // 200 OK
            res.status(200).send({
              provider_id,
              provider_name,
              provider_vehicle_id,
              provider_device
            })
          }
        } else {
          // 409 Conflict
          res.status(409).send({ error: new ConflictError('audit_trip_id_already_exists', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          res.status(400).send({ error: err })
        } else {
          // 500 Internal Server Error
          await log.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
          res.status(500).send({ error: new ServerError(err) })
        }
      }
    }
  )

  /**
   * add an event to an audit
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   * @param {string} device_id device_id
   */
  app.post(
    pathsFor('/trips/:audit_trip_id/vehicle/event'),
    checkScope(check => check('audits:write')),
    async (req: AuditApiVehicleEventRequest, res: AuditApiResponse) => {
      try {
        const { audit_trip_id, audit_subject_id, audit, recorded } = res.locals

        if (audit) {
          const { audit_event_id = uuid(), event_type, timestamp, telemetry } = req.body

          // Validate input params
          if (
            isValidVehicleEventType(event_type) &&
            isValidTimestamp(timestamp) &&
            isValidTelemetry(telemetry, { required: false })
          ) {
            // Create the audit start event
            await writeAuditEvent({
              audit_trip_id,
              audit_event_id,
              audit_subject_id,
              audit_event_type: event_type,
              ...flattenTelemetry(telemetry),
              timestamp,
              recorded
            })

            // 200 OK
            res.status(200).send({})
          }
        } else {
          // 404 Not Found
          res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          res.status(400).send({ error: err })
        } else {
          // 500 Internal Server Error
          await log.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
          res.status(500).send({ error: new ServerError(err) })
        }
      }
    }
  )

  /**
   * add telemetry to an audit
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   */
  app.post(
    pathsFor('/trips/:audit_trip_id/vehicle/telemetry'),
    checkScope(check => check('audits:write')),
    async (req: AuditApiVehicleTelemetryRequest, res: AuditApiResponse) => {
      try {
        const { audit_trip_id, audit_subject_id, audit, recorded } = res.locals

        if (audit) {
          const { telemetry, audit_event_id = uuid(), timestamp } = req.body

          // Validate input params
          if (isValidTelemetry(telemetry) && isValidTimestamp(timestamp)) {
            // Create the telemetry event
            await writeAuditEvent({
              audit_trip_id,
              audit_event_id,
              audit_subject_id,
              audit_event_type: AUDIT_EVENT_TYPES.telemetry,
              ...flattenTelemetry(telemetry),
              timestamp,
              recorded
            })

            // 200 OK
            res.status(200).send({})
          }
        } else {
          // 404 Not Found
          res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          res.status(400).send({ error: err })
        } else {
          // 500 Internal Server Error
          await log.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
          res.status(500).send({ error: new ServerError(err) })
        }
      }
    }
  )

  /**
   * add a note to an audit
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   */
  app.post(
    [...pathsFor('/trips/:audit_trip_id/note'), ...pathsFor('/trips/:audit_trip_id/event')],
    checkScope(check => check('audits:write')),
    async (req: AuditApiAuditNoteRequest, res: AuditApiResponse) => {
      try {
        const { audit_trip_id, audit, audit_subject_id, recorded } = res.locals

        if (audit) {
          const {
            audit_event_id = uuid(),
            audit_event_type = AUDIT_EVENT_TYPES.note,
            audit_issue_code,
            note,
            timestamp,
            telemetry
          } = req.body

          // Validate input params
          if (
            isValidAuditEventId(audit_event_id) &&
            isValidAuditEventType(audit_event_type, {
              accept: [AUDIT_EVENT_TYPES.issue, AUDIT_EVENT_TYPES.note, AUDIT_EVENT_TYPES.summary]
            }) &&
            isValidTimestamp(timestamp) &&
            isValidTelemetry(telemetry, { required: false }) &&
            isValidAuditIssueCode(audit_issue_code, { required: false }) &&
            isValidAuditNote(note, {
              required: audit_event_type === AUDIT_EVENT_TYPES.note || audit_event_type === AUDIT_EVENT_TYPES.summary
            })
          ) {
            // Create the audit event
            await writeAuditEvent({
              audit_trip_id,
              audit_event_id,
              audit_subject_id,
              audit_event_type,
              audit_issue_code,
              note,
              ...flattenTelemetry(telemetry),
              timestamp,
              recorded
            })

            // 200 OK
            res.status(200).send({})
          }
        } else {
          // 404 Not Found
          res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          res.status(400).send({ error: err })
        } else {
          // 500 Internal Server Error
          await log.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
          res.status(500).send({ error: new ServerError(err) })
        }
      }
    }
  )

  /**
   * terminate an audit
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   */
  app.post(
    pathsFor('/trips/:audit_trip_id/end'),
    checkScope(check => check('audits:write')),
    async (req: AuditApiAuditEndRequest, res: AuditApiResponse) => {
      try {
        const { audit_trip_id, audit, audit_subject_id, recorded } = res.locals
        if (audit) {
          const { audit_event_id = uuid(), timestamp, telemetry } = req.body

          // Validate input params
          if (
            isValidAuditEventId(audit_event_id) &&
            isValidAuditEventId(audit_event_id) &&
            isValidTimestamp(timestamp) &&
            isValidTelemetry(telemetry, { required: false })
          ) {
            // Create the audit end event
            await writeAuditEvent({
              audit_trip_id,
              audit_event_id,
              audit_subject_id,
              audit_event_type: AUDIT_EVENT_TYPES.end,
              ...flattenTelemetry(telemetry),
              timestamp,
              recorded
            })

            // 200 OK
            res.status(200).send({})
          }
        } else {
          // 404 Not Found
          res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          res.status(400).send({ error: err })
        } else {
          // 500 Internal Server Error
          await log.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
          res.status(500).send({ error: new ServerError(err) })
        }
      }
    }
  )

  /**
   * read back an audit record
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   */
  app.get(
    pathsFor('/trips/:audit_trip_id'),
    checkScope(check => check('audits:read')),
    async (req: AuditApiGetTripRequest, res: AuditApiResponse<AuditDetails>) => {
      try {
        const { audit_trip_id, audit } = res.locals

        if (audit) {
          const { provider_id, provider_vehicle_id, provider_device_id } = audit

          // Read the audit events
          const auditEvents = await readAuditEvents(audit_trip_id)

          const device = provider_device_id
            ? await readDevice(provider_device_id, provider_id)
            : await readDeviceByVehicleId(provider_id, provider_vehicle_id)

          if (device) {
            // Calculate the event window for the provider vehicle (trip_start/trip_end)
            const { audit_start, last_event, audit_end } = auditEvents
              .sort((a, b) => a.timestamp - b.timestamp)
              .reduce<
                Partial<{
                  audit_start: Timestamp
                  last_event: Timestamp
                  audit_end: Timestamp
                }>
              >((trip, event: Pick<AuditEvent, 'audit_event_type' | 'timestamp'>) => {
                if (event.audit_event_type === AUDIT_EVENT_TYPES.start) {
                  return {
                    ...trip,
                    audit_start: trip.audit_start ? Math.min(trip.audit_start, event.timestamp) : event.timestamp
                  }
                }
                if (event.audit_event_type === AUDIT_EVENT_TYPES.end) {
                  return {
                    ...trip,
                    audit_end: trip.audit_end ? Math.max(trip.audit_end, event.timestamp) : event.timestamp
                  }
                }
                return {
                  ...trip,
                  last_event: trip.last_event ? Math.max(trip.last_event, event.timestamp) : event.timestamp
                }
              }, {})

            const event_viewport_adjustment = seconds(Number(req.query.event_viewport_adjustment) || 30)
            const start_time = audit_start && audit_start - event_viewport_adjustment
            const end_time = (end => end && end + event_viewport_adjustment)(audit_end || last_event)

            if (start_time && end_time) {
              const deviceEvents = await readEvents(device.device_id, start_time, end_time)
              const deviceTelemetry = await readTelemetry(device.device_id, start_time, end_time)

              res.status(200).send({
                ...audit,
                provider_vehicle_id: device.vehicle_id,
                events: auditEvents.map(withGpsProperty),
                provider: {
                  device,
                  events: deviceEvents,
                  telemetry: deviceTelemetry
                }
              })
            } else {
              res.status(200).send({
                ...audit,
                events: auditEvents.map(withGpsProperty),
                provider: { device, events: [], telemetry: [] }
              })
            }
          } else {
            res.status(200).send({ ...audit, events: auditEvents.map(withGpsProperty), provider: null })
          }
        } else {
          // 404 Not Found
          res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          res.status(400).send({ error: err })
        } else {
          // 500 Internal Server Error
          await log.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
          res.status(500).send({ error: new ServerError(err) })
        }
      }
    }
  )

  app.delete(
    pathsFor('/trips/:audit_trip_id'),
    checkScope(check => check('audits:delete')),
    async (req: AuditApiTripRequest, res: AuditApiResponse) => {
      try {
        const { audit_trip_id, audit } = res.locals
        if (audit) {
          // Delete the audit
          await deleteAudit(audit_trip_id)
          // 200 OK
          res.status(200).send({})
        } else {
          // 404 Not Found
          res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          res.status(400).send({ error: err })
        } else {
          // 500 Internal Server Error
          await log.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
          res.status(500).send({ error: new ServerError(err) })
        }
      }
    }
  )

  /**
   * read back multiple audit records
   */
  app.get(
    pathsFor('/trips'),
    checkScope(check => check('audits:read')),
    async (req: AuditApiGetTripsRequest, res: AuditApiResponse) => {
      try {
        const { start_time, end_time } = req.query
        const { skip, take } = asPagingParams(req.query)

        // Construct the query params
        const query = {
          ...req.query,
          skip,
          take,
          start_time: start_time ? Number(start_time) : undefined,
          end_time: end_time ? Number(end_time) : undefined
        }

        // Query the audits
        const { count, audits } = await readAudits(query)

        // 200 OK
        res.status(200).send({ count, audits, links: asJsonApiLinks(req, skip, take, count) })
      } catch (err) /* istanbul ignore next */ {
        // 500 Internal Server Error
        await log.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
        res.status(500).send({ error: new ServerError(err) })
      }
    }
  )

  app.get(pathsFor('/vehicles'), checkScope(check => check('audits:vehicles:read')), async (req, res) => {
    const { skip, take } = asPagingParams(req.query)
    const bbox = JSON.parse(req.query.bbox)

    const url = urls.format({
      protocol: req.get('x-forwarded-proto') || req.protocol,
      host: req.get('host'),
      pathname: req.path
    })

    const { provider_id } = req.query

    try {
      const response = await getVehicles(skip, take, url, provider_id, req.query, bbox)
      res.status(200).send(response)
    } catch (err) {
      await log.error('getVehicles fail', err)
      res.status(500).send({
        error: 'server_error',
        error_description: 'an internal server error has occurred and been logged'
      })
    }
  })

  return app
}

// //////////////////// end audit-only endpoints ///////////////////////

export { api }
