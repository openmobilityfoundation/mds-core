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

import {
  Audit,
  Telemetry,
  Timestamp,
  UUID,
  Device,
  VehicleEvent,
  AttachmentSummary,
  AuditEvent,
  WithGpsProperty,
  VEHICLE_EVENT,
  VEHICLE_STATE,
  Nullable
} from '@mds-core/mds-types'
import {
  ApiRequest,
  ApiRequestQuery,
  ApiVersionedResponse,
  ApiRequestParams,
  ApiResponseLocals,
  ApiResponseLocalsClaims
} from '@mds-core/mds-api-server'

export const AUDIT_API_SUPPORTED_VERSIONS = ['0.1.0'] as const
export type AUDIT_API_SUPPORTED_VERSION = typeof AUDIT_API_SUPPORTED_VERSIONS[number]
export const [AUDIT_API_DEFAULT_VERSION] = AUDIT_API_SUPPORTED_VERSIONS

// Allow adding type definitions for Express Request objects
export type AuditApiRequest<B = {}> = ApiRequest<B>

export type AuditApiTripRequest<B = {}> = AuditApiRequest<B> & ApiRequestParams<'audit_trip_id'>

export type AuditApiAuditStartRequest = AuditApiTripRequest<{
  audit_device_id: string
  audit_event_id: UUID
  audit_event_type: string
  provider_id: UUID
  provider_vehicle_id: string
  telemetry?: Telemetry
  timestamp: Timestamp
}>

export type AuditApiVehicleEventRequest = AuditApiTripRequest<{
  audit_event_id: UUID
  event_type: string
  telemetry?: Telemetry
  trip_id: UUID
  timestamp: Timestamp
}>

export type AuditApiVehicleTelemetryRequest = AuditApiTripRequest<{
  audit_event_id: UUID
  telemetry: Telemetry
  timestamp: Timestamp
}>

export type AuditApiAuditNoteRequest = AuditApiTripRequest<{
  audit_event_id: UUID
  audit_event_type: string
  audit_issue_code?: string
  note?: string
  telemetry?: Telemetry
  timestamp: Timestamp
}>

export interface AuditApiAuditEndRequest extends AuditApiTripRequest {
  body: {
    audit_event_id: UUID
    audit_event_type: string
    telemetry?: Telemetry
    timestamp: Timestamp
  }
}

export type AuditApiGetTripsRequest = AuditApiRequest &
  ApiRequestQuery<
    'skip' | 'take' | 'provider_id' | 'provider_vehicle_id' | 'audit_subject_id' | 'start_time' | 'end_time'
  >

export type AuditApiGetTripRequest = AuditApiTripRequest & ApiRequestQuery<'event_viewport_adjustment'>

export type AuditApiGetVehicleRequest = AuditApiRequest &
  ApiRequestParams<'provider_id' | 'vin'> &
  ApiRequestQuery<'strict' | 'bbox' | 'provider_id'>

export type AuditApiAccessTokenScopes =
  | 'audits:write'
  | 'audits:read'
  | 'audits:delete'
  | 'audits:vehicles:read'
  | 'audits:read:provider'

type AuditWithAttachmentSummary = Audit & { attachments: AttachmentSummary[]; id: number }
type AuditedDevice =
  | Readonly<
      Required<
        Device & {
          id: number
        }
      >
    >
  | (Device & {
      updated?: number | null | undefined
    })
// Allow adding type definitions for Express Response objects
export type AuditApiResponse<B = {}> = ApiVersionedResponse<AUDIT_API_SUPPORTED_VERSION, B> &
  ApiResponseLocalsClaims<AuditApiAccessTokenScopes> &
  ApiResponseLocals<'audit_subject_id', string> &
  ApiResponseLocals<'audit_trip_id', UUID> &
  ApiResponseLocals<'audit', Nullable<Audit>> &
  ApiResponseLocals<'recorded', Timestamp>

export type PostAuditTripStartResponse = AuditApiResponse<{
  provider_id: string
  provider_name: string
  provider_vehicle_id: string
  provider_device: (Device & { updated?: number | null | undefined }) | null
}>

export type PostAuditTripVehicleEventResponse = AuditApiResponse<{}>
export type PostAuditTripTelemetryResponse = AuditApiResponse<{}>
export type PostAuditTripNoteResponse = AuditApiResponse<{}>
export type PostAuditTripEventResponse = AuditApiResponse<{}>
export type PostAuditTripEndResponse = AuditApiResponse<{}>
export type PostAuditAttachmentResponse = AuditApiResponse<AttachmentSummary & { audit_trip_id: UUID }>

type ReadOnlyVehicleEvent = Readonly<Required<VehicleEvent & { id: number }>>
type ReadOnlyAuditEvent = Readonly<Required<AuditEvent & { id: number }>>

export type GetAuditTripDetailsResponse = AuditApiResponse<
  Audit & {
    events: WithGpsProperty<ReadOnlyAuditEvent>[]
    attachments: AttachmentSummary[]
    provider_event_types?: VEHICLE_EVENT[]
    provider_vehicle_state?: VEHICLE_STATE // any
    provider_telemetry?: Telemetry | null //  providerEvent[0]?.telemetry,
    provider_event_time?: Timestamp // providerEvent[0]?.timestamp,
    provider: {
      device: AuditedDevice
      events: ReadOnlyVehicleEvent[] | never[]
      telemetry: Readonly<
        Required<
          Telemetry & {
            id: number
          }
        >
      >[]
    } | null
  }
>

export type GetAuditTripsDetailsResponse = AuditApiResponse<{
  count: number
  audits: AuditWithAttachmentSummary[]
  links:
    | Partial<{
        first: string | undefined
        prev: string | undefined
        next: string | undefined
        last: string | undefined
      }>
    | undefined
}>

export type GetAuditVehiclesResponse = AuditApiResponse<{
  total: number
  links: {
    first: string
    last: string
    prev: string | null
    next: string | null
  }
  vehicles: (Device & VehicleEvent)[]
}>
export type GetVehicleByVinResponse = AuditApiResponse<{
  vehicles: (
    | (Device & {
        updated?: number | null | undefined
      })
    | null
  )[]
}>

export type DeleteAuditTripResponse = AuditApiResponse<{}>
export type DeleteAuditAttachmentResponse = AuditApiResponse<{}>
