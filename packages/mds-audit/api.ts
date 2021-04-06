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

import db from '@mds-core/mds-db'
import express from 'express'
import {
  uuid,
  pathPrefix,
  seconds,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ServerError,
  UnsupportedTypeError
} from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'
import urls from 'url'

import {
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
  ValidationError
} from '@mds-core/mds-schema-validators'

import { providerName } from '@mds-core/mds-providers' // map of uuids -> obj
import { AUDIT_EVENT_TYPES, AuditEvent, Timestamp, Telemetry, TelemetryData } from '@mds-core/mds-types'
import { parsePagingQueryParams, asJsonApiLinks, parseRequest } from '@mds-core/mds-api-helpers'
import { checkAccess, AccessTokenScopeValidator } from '@mds-core/mds-api-server'
import { isError } from '@mds-core/mds-service-helpers'
import {
  AuditApiAuditEndRequest,
  AuditApiAuditNoteRequest,
  AuditApiAuditStartRequest,
  AuditApiGetTripRequest,
  AuditApiGetTripsRequest,
  AuditApiGetVehicleRequest,
  AuditApiRequest,
  AuditApiResponse,
  AuditApiTripRequest,
  AuditApiVehicleEventRequest,
  AuditApiVehicleTelemetryRequest,
  AuditApiAccessTokenScopes,
  PostAuditTripStartResponse,
  PostAuditTripVehicleEventResponse,
  PostAuditTripTelemetryResponse,
  PostAuditTripNoteResponse,
  PostAuditTripEndResponse,
  GetAuditTripDetailsResponse,
  PostAuditTripEventResponse,
  DeleteAuditTripResponse,
  GetAuditVehiclesResponse,
  GetVehicleByVinResponse,
  PostAuditAttachmentResponse,
  GetAuditTripsDetailsResponse
} from './types'
import {
  deleteAudit,
  getVehicle,
  getVehicles,
  readAudit,
  readAuditEvents,
  readAudits,
  readDevice,
  readEvents,
  readTelemetry,
  withGpsProperty,
  writeAudit,
  writeAuditEvent
} from './service'
import {
  attachmentSummary,
  deleteAuditAttachment,
  multipartFormUpload,
  readAttachments,
  writeAttachment
} from './attachments'
import { AuditApiVersionMiddleware } from './middleware'

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

const checkAuditApiAccess = (validator: AccessTokenScopeValidator<AuditApiAccessTokenScopes>) => checkAccess(validator)

function api(app: express.Express): express.Express {
  /**
   * Audit-specific middleware to extract subject_id into locals, do some logging, etc.
   * NOTE that audit will be city-facing only, not Providers.
   */
  app.use(AuditApiVersionMiddleware)

  app.use(async (req: AuditApiRequest, res: AuditApiResponse, next) => {
    if (!req.path.includes('/health')) {
      if (res.locals.claims) {
        // verify presence of subject_id
        const { principalId, user_email } = res.locals.claims
        const subject_id = user_email || principalId

        /* istanbul ignore if */
        if (subject_id) {
          // stash audit_subject_id and timestamp (for recording db writes)
          res.locals.audit_subject_id = subject_id
          res.locals.recorded = Date.now()
          return next()
        }
      }
      logger.warn('Missing subject_id', { method: req.method, originalUrl: req.originalUrl })
      // 403 Forbidden
      return res.status(403).send({ error: new AuthorizationError('missing_subject_id') })
    }
    return next()
  })

  /**
   * Audit middleware to load the audit into locals using the audit_trip_id
   */
  app.use(pathPrefix('/trips/:audit_trip_id'), async (req: AuditApiTripRequest, res: AuditApiResponse, next) => {
    try {
      const { audit_trip_id } = req.params
      if (isValidAuditTripId(audit_trip_id)) {
        res.locals.audit_trip_id = audit_trip_id
        res.locals.audit = await readAudit(audit_trip_id)
      }
      return next()
    } catch (err) /* istanbul ignore next */ {
      if (err instanceof ValidationError) {
        // 400 Bad Request
        return res.status(400).send({ error: err })
      }
      // 500 Internal Server Error
      logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
      return res.status(500).send({ error: new ServerError(err) })
    }
  })

  // /////////////////// begin audit-only endpoints //////////////////////

  /**
   * initiate an audit
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   */
  app.post(
    pathPrefix('/trips/:audit_trip_id/start'),
    checkAuditApiAccess(scopes => scopes.includes('audits:write')),
    async (req: AuditApiAuditStartRequest, res: PostAuditTripStartResponse) => {
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
            // Find provider device and event by vehicle id lookup
            const provider_device = await getVehicle(provider_id, provider_vehicle_id)
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
            return res.status(200).send({
              version: res.locals.version,
              provider_id,
              provider_name,
              provider_vehicle_id,
              provider_device
            })
          }
        } else {
          // 409 Conflict
          return res.status(409).send({ error: new ConflictError('audit_trip_id_already_exists', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          return res.status(400).send({ error: err })
        }
        // 500 Internal Server Error
        logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
        return res.status(500).send({ error: new ServerError(err) })
      }
    }
  )

  /**
   * add an event to an audit
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   * @param {string} device_id device_id
   */
  app.post(
    pathPrefix('/trips/:audit_trip_id/vehicle/event'),
    checkAuditApiAccess(scopes => scopes.includes('audits:write')),
    async (req: AuditApiVehicleEventRequest, res: PostAuditTripVehicleEventResponse) => {
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
            // Create the audit event
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
            return res.status(200).send({ version: res.locals.version })
          }
        } else {
          // 404 Not Found
          return res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          return res.status(400).send({ error: err })
        }
        // 500 Internal Server Error
        logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
        return res.status(500).send({ error: new ServerError(err) })
      }
    }
  )

  /**
   * add telemetry to an audit
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   */
  app.post(
    pathPrefix('/trips/:audit_trip_id/vehicle/telemetry'),
    checkAuditApiAccess(scopes => scopes.includes('audits:write')),
    async (req: AuditApiVehicleTelemetryRequest, res: PostAuditTripTelemetryResponse) => {
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
            return res.status(200).send({ version: res.locals.version })
          }
        } else {
          // 404 Not Found
          return res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          return res.status(400).send({ error: err })
        }
        // 500 Internal Server Error
        logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
        return res.status(500).send({ error: new ServerError(err) })
      }
    }
  )

  /**
   * add a note to an audit
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   */
  app.post(
    [pathPrefix('/trips/:audit_trip_id/note'), pathPrefix('/trips/:audit_trip_id/event')],
    checkAuditApiAccess(scopes => scopes.includes('audits:write')),
    async (req: AuditApiAuditNoteRequest, res: PostAuditTripNoteResponse | PostAuditTripEventResponse) => {
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
            return res.status(200).send({ version: res.locals.version })
          }
        } else {
          // 404 Not Found
          return res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          return res.status(400).send({ error: err })
        }
        // 500 Internal Server Error
        logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
        return res.status(500).send({ error: new ServerError(err) })
      }
    }
  )

  /**
   * terminate an audit
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   */
  app.post(
    pathPrefix('/trips/:audit_trip_id/end'),
    checkAuditApiAccess(scopes => scopes.includes('audits:write')),
    async (req: AuditApiAuditEndRequest, res: PostAuditTripEndResponse) => {
      try {
        const { audit_trip_id, audit, audit_subject_id, recorded } = res.locals
        if (audit) {
          const { audit_event_id = uuid(), timestamp, telemetry } = req.body

          // Validate input params
          if (
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
            return res.status(200).send({ version: res.locals.version })
          }
        } else {
          // 404 Not Found
          return res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
        }
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          return res.status(400).send({ error: err })
        }
        // 500 Internal Server Error
        logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
        return res.status(500).send({ error: new ServerError(err) })
      }
    }
  )

  /**
   * read back an audit record
   * @param {UUID} audit_trip_id unique ID of this audit record (client-generated)
   */
  app.get(
    pathPrefix('/trips/:audit_trip_id'),
    checkAuditApiAccess(scopes => scopes.includes('audits:read')),
    async (req: AuditApiGetTripRequest, res: GetAuditTripDetailsResponse) => {
      try {
        const { audit_trip_id, audit } = res.locals

        if (audit) {
          const { provider_id, provider_vehicle_id, provider_device_id } = audit

          // Read the audit events
          const auditEvents = await readAuditEvents(audit_trip_id)

          // Read the audit attachments
          const attachments = await readAttachments(audit_trip_id)

          const device = provider_device_id
            ? await readDevice(provider_device_id, provider_id)
            : await getVehicle(provider_id, provider_vehicle_id)

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

            const { event_viewport_adjustment = seconds(30) } = parseRequest(req)
              .single({ parser: x => seconds(Number(x)) })
              .query('event_viewport_adjustment')

            const start_time = audit_start && audit_start - event_viewport_adjustment
            const end_time = (end => end && end + event_viewport_adjustment)(audit_end || last_event)

            if (start_time && end_time) {
              const deviceEvents = await readEvents(device.device_id, start_time, end_time)
              const deviceTelemetry = await readTelemetry(device.device_id, start_time, end_time)
              const [providerEvent] = await db.readEventsWithTelemetry({
                device_id: device.device_id,
                provider_id: device.provider_id,
                end_time: audit_start, // Last provider event before the audit started
                order_by: 'timestamp DESC',
                limit: 1
              })
              return res.status(200).send({
                version: res.locals.version,
                ...audit,
                provider_vehicle_id: device.vehicle_id,
                provider_event_types: providerEvent.event_types,
                provider_vehicle_state: providerEvent.vehicle_state,
                provider_telemetry: providerEvent.telemetry,
                provider_event_time: providerEvent.timestamp,
                events: auditEvents.map(withGpsProperty),
                attachments: attachments.map(attachmentSummary),
                provider: {
                  device,
                  events: deviceEvents,
                  telemetry: deviceTelemetry
                }
              })
            }
            return res.status(200).send({
              version: res.locals.version,
              ...audit,
              events: auditEvents.map(withGpsProperty),
              attachments: attachments.map(attachmentSummary),
              provider: { device, events: [], telemetry: [] }
            })
          }
          return res.status(200).send({
            version: res.locals.version,
            ...audit,
            events: auditEvents.map(withGpsProperty),
            attachments: attachments.map(attachmentSummary),
            provider: null
          })
        }
        // 404 Not Found
        return res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          return res.status(400).send({ error: err })
        }
        // 500 Internal Server Error
        logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
        return res.status(500).send({ error: new ServerError(err) })
      }
    }
  )

  app.delete(
    pathPrefix('/trips/:audit_trip_id'),
    checkAuditApiAccess(scopes => scopes.includes('audits:delete')),
    async (req: AuditApiTripRequest, res: DeleteAuditTripResponse) => {
      try {
        const { audit_trip_id, audit } = res.locals
        if (audit) {
          // Delete the audit
          await deleteAudit(audit_trip_id)
          // 200 OK
          return res.status(200).send({ version: res.locals.version })
        }
        // 404 Not Found
        return res.status(404).send({ error: new NotFoundError('audit_trip_id_not_found', { audit_trip_id }) })
      } catch (err) /* istanbul ignore next */ {
        if (err instanceof ValidationError) {
          // 400 Bad Request
          return res.status(400).send({ error: err })
        }
        // 500 Internal Server Error
        logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
        return res.status(500).send({ error: new ServerError(err) })
      }
    }
  )

  /**
   * read back multiple audit records
   */
  app.get(
    pathPrefix('/trips'),
    checkAuditApiAccess(scopes => scopes.includes('audits:read') || scopes.includes('audits:read:provider')),
    async (req: AuditApiGetTripsRequest, res: GetAuditTripsDetailsResponse) => {
      try {
        const { scopes } = res.locals
        const { skip, take } = parsePagingQueryParams(req)

        const { provider_id: queried_provider_id, provider_vehicle_id, audit_subject_id } = parseRequest(req)
          .single()
          .query('provider_id', 'provider_vehicle_id', 'audit_subject_id')

        const provider_id = scopes.includes('audits:read') ? queried_provider_id : res.locals.claims?.provider_id

        if (provider_id === null) {
          /* This should never happen -- a client with just the audits:read:provider scope
           * should *always* have a provider_id claim in their token.
           */
          return res.status(500).send({ error: 'internal_server_error' })
        }

        const { start_time, end_time } = parseRequest(req).single({ parser: Number }).query('start_time', 'end_time')
        const query = {
          start_time,
          end_time,
          skip,
          take,
          provider_id,
          provider_vehicle_id,
          audit_subject_id
        }

        // Query the audits
        const { count, audits } = await readAudits(query)
        const auditsWithAttachments = await Promise.all(
          audits.map(async audit => {
            const attachments = await readAttachments(audit.audit_trip_id)
            return {
              ...audit,
              attachments: attachments.map(attachmentSummary)
            }
          })
        )

        // 200 OK
        return res.status(200).send({
          version: res.locals.version,
          count,
          audits: auditsWithAttachments,
          links: asJsonApiLinks(req, skip, take, count)
        })
      } catch (err) /* istanbul ignore next */ {
        // 500 Internal Server Error
        logger.error(`fail ${req.method} ${req.originalUrl}`, err.stack || JSON.stringify(err))
        return res.status(500).send({ error: new ServerError(err) })
      }
    }
  )

  /**
   * read back cached vehicle information for vehicles in bbox
   */
  app.get(
    pathPrefix('/vehicles'),
    checkAuditApiAccess(scopes => scopes.includes('audits:vehicles:read')),
    async (req: AuditApiGetVehicleRequest, res: GetAuditVehiclesResponse) => {
      const { skip, take } = { skip: 0, take: 10000 }
      const { strict = true, bbox, provider_id } = {
        ...parseRequest(req).single({ parser: JSON.parse }).query('strict', 'bbox'),
        ...parseRequest(req).single().query('provider_id')
      }

      const url = urls.format({
        protocol: req.get('x-forwarded-proto') || req.protocol,
        host: req.get('host'),
        pathname: req.path
      })

      try {
        const response = await getVehicles(skip, take, url, req.query, bbox, strict, provider_id)
        return res.status(200).send({ version: res.locals.version, ...response })
      } catch (err) {
        logger.error('getVehicles fail', err)
        return res.status(500).send({
          error: 'internal_server_error'
        })
      }
    }
  )

  /**
   * read back cached information for a single vehicle
   */
  app.get(
    pathPrefix('/vehicles/:provider_id/vin/:vin'),
    async (req: AuditApiGetVehicleRequest, res: GetVehicleByVinResponse) => {
      const { provider_id, vin } = req.params
      try {
        const response = await getVehicle(provider_id, vin)
        if (response) {
          res.status(200).send({ version: res.locals.version, vehicles: [response] })
        } else {
          res.status(404).send({ error: new NotFoundError('vehicle not found', { provider_id, vin }) })
        }
      } catch (err) {
        logger.error('getVehicle fail', err)
        res.status(500).send({
          error: 'internal_server_error'
        })
      }
    }
  )

  /**
   * attach media to an audit, uploaded as multipart/form-data
   */
  app.post(
    pathPrefix('/trips/:audit_trip_id/attach/:mimetype'),
    multipartFormUpload,
    async (req, res: PostAuditAttachmentResponse) => {
      const { audit, audit_trip_id } = res.locals

      if (!audit) return res.status(404).send({ error: new NotFoundError('audit not found', { audit_trip_id }) })

      try {
        const attachment = await writeAttachment(req.file, audit_trip_id)
        res.status(200).send({
          version: res.locals.version,
          ...attachmentSummary(attachment),
          audit_trip_id
        })
      } catch (err) {
        if (isError(err, ValidationError)) return res.status(400).send({ error: err })

        if (isError(err, UnsupportedTypeError)) return res.status(415).send({ error: err })

        logger.error('post attachment fail', err)
        return res.status(500).send({ error: new ServerError(err) })
      }
    }
  )

  /**
   * delete media from an audit
   */
  app.delete(pathPrefix('/trips/:audit_trip_id/attachment/:attachment_id'), async (req, res) => {
    const { audit_trip_id, attachment_id } = req.params
    try {
      await deleteAuditAttachment(audit_trip_id, attachment_id)
      res.status(200).send({ version: res.locals.version })
    } catch (err) {
      logger.error('delete attachment error', err)
      if (err instanceof NotFoundError) {
        return res.status(404).send({ error: err })
      }
      return res.status(500).send({ error: new ServerError(err) })
    }
  })

  return app
}

// //////////////////// end audit-only endpoints ///////////////////////

export { api }
