/**
 * Copyright 2020 City of Los Angeles
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

import { DomainModelCreate, RecordedColumn } from '@mds-core/mds-repository'
import {
  Nullable,
  NullableOptional,
  PROPULSION_TYPE,
  TelemetryData,
  Timestamp,
  UUID,
  VEHICLE_EVENT,
  VEHICLE_STATE,
  VEHICLE_TYPE
} from '@mds-core/mds-types'
import { RpcServiceDefinition, RpcRoute } from '@mds-core/mds-rpc-common'

export interface DeviceDomainModel extends RecordedColumn {
  device_id: UUID
  provider_id: UUID
  vehicle_id: string
  vehicle_type: VEHICLE_TYPE
  propulsion_types: PROPULSION_TYPE[]

  year: Nullable<number>
  mfgr: Nullable<string>
  model: Nullable<string>
}

export type DeviceDomainCreateModel = DomainModelCreate<Omit<DeviceDomainModel, keyof RecordedColumn>>

/* More flexible version of WithGpsProperty */
type WithGpsData<T extends TelemetryData, P extends string = 'gps'> = Omit<T, keyof Omit<TelemetryData, 'charge'>> &
  {
    [p in P]: Omit<T, 'charge'>
  }

export interface TelemetryDomainModel
  extends WithGpsData<NullableOptional<Omit<TelemetryData, 'hdop' | 'satellites'>>>,
    RecordedColumn {
  device_id: UUID
  provider_id: UUID
  timestamp: Timestamp
}

export type TelemetryDomainCreateModel = DomainModelCreate<Omit<TelemetryDomainModel, keyof RecordedColumn>>

export interface EventDomainModel extends RecordedColumn {
  device_id: UUID
  provider_id: UUID
  timestamp: Timestamp
  event_types: VEHICLE_EVENT[]
  vehicle_state: VEHICLE_STATE

  telemetry_timestamp: Nullable<Timestamp>
  telemetry: Nullable<TelemetryDomainModel>
  trip_id: Nullable<UUID>
  service_area_id: Nullable<UUID>
}

export type EventDomainCreateModel = DomainModelCreate<Omit<EventDomainModel, keyof RecordedColumn>>

export interface IngestService {
  name: () => string
}

export const IngestServiceDefinition: RpcServiceDefinition<IngestService> = {
  name: RpcRoute<IngestService['name']>()
}
