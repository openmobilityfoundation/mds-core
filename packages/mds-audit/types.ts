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

import { UUID, Telemetry, Timestamp, Audit } from 'mds'
import { ApiAuthorizerClaims } from 'mds-api-authorizer'
import { ApiRequest, ApiResponse } from 'mds-api-server'

// Allow adding type definitions for Express Request objects
export type AuditApiRequest = ApiRequest

export interface AuditApiTripRequest extends AuditApiRequest {
  params: { audit_trip_id: UUID }
}

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

export interface AuditApiGetTripsRequest extends AuditApiRequest {
  // Query string parameters always come in as strings
  query: Partial<
    {
      [P in
        | 'skip'
        | 'take'
        | 'provider_id'
        | 'provider_vehicle_id'
        | 'audit_subject_id'
        | 'start_time'
        | 'end_time']: string
    }
  >
}

export interface AuditApiGetTripRequest extends AuditApiTripRequest {
  query: Partial<{ [P in 'event_viewport_adjustment']: string }>
}

// Allow adding type definitions for Express Response objects
export interface AuditApiResponse<T = {}> extends ApiResponse<T> {
  locals: {
    claims: ApiAuthorizerClaims
    audit_subject_id: string
    audit_trip_id: UUID
    audit: Audit | null
    recorded: Timestamp
  }
}
