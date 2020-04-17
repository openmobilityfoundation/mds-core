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

import { Audit, Telemetry, Timestamp, UUID } from '@mds-core/mds-types'
import { ApiRequest, ApiResponse, ApiResponseLocals, ApiQuery } from '@mds-core/mds-api-server'
import { Params, ParamsDictionary } from 'express-serve-static-core'

// Allow adding type definitions for Express Request objects
export type AuditApiRequest<P extends Params = ParamsDictionary> = ApiRequest<P>

export type AuditApiTripRequest<Q extends string = ''> = AuditApiRequest<{ audit_trip_id: UUID }> & ApiQuery<Q>

export interface AuditApiAuditStartRequest extends AuditApiTripRequest {
  body: {
    audit_device_id: string
    audit_event_id: UUID
    audit_event_type: string
    provider_id: UUID
    provider_vehicle_id: string
    telemetry?: Telemetry
    timestamp: Timestamp
  }
}

export interface AuditApiVehicleEventRequest extends AuditApiTripRequest {
  body: {
    audit_event_id: UUID
    event_type: string
    telemetry?: Telemetry
    trip_id: UUID
    timestamp: Timestamp
  }
}

export interface AuditApiVehicleTelemetryRequest extends AuditApiTripRequest {
  body: {
    audit_event_id: UUID
    telemetry: Telemetry
    timestamp: Timestamp
  }
}

export interface AuditApiAuditNoteRequest extends AuditApiTripRequest {
  body: {
    audit_event_id: UUID
    audit_event_type: string
    audit_issue_code?: string
    note?: string
    telemetry?: Telemetry
    timestamp: Timestamp
  }
}

export interface AuditApiAuditEndRequest extends AuditApiTripRequest {
  body: {
    audit_event_id: UUID
    audit_event_type: string
    telemetry?: Telemetry
    timestamp: Timestamp
  }
}

export type AuditApiGetTripsRequest = AuditApiRequest &
  ApiQuery<
    Partial<'skip' | 'take' | 'provider_id' | 'provider_vehicle_id' | 'audit_subject_id' | 'start_time' | 'end_time'>
  >

export type AuditApiGetTripRequest = AuditApiTripRequest<Partial<'event_viewport_adjustment'>>

export interface AuditApiGetVehicleRequest extends AuditApiRequest {
  params: {
    provider_id: UUID
    vin: string
  }
}

// Allow adding type definitions for Express Response objects
export interface AuditApiResponse<T = {}> extends ApiResponse<T> {
  locals: ApiResponseLocals & {
    audit_subject_id: string
    audit_trip_id: UUID
    audit: Audit | null
    recorded: Timestamp
  }
}
