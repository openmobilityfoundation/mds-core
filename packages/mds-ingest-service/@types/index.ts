import { DomainModelCreate, RecordedColumn } from '@mds-core/mds-repository'
import {
  Nullable,
  NullableOptional,
  PROPULSION_TYPE,
  TelemetryData,
  Timestamp,
  UUID,
  VEHICLE_EVENT,
  VEHICLE_REASON,
  VEHICLE_TYPE
} from '@mds-core/mds-types'
import { RpcServiceDefinition, RpcRoute } from '@mds-core/mds-rpc-common'

export interface DeviceDomainModel extends RecordedColumn {
  device_id: UUID
  provider_id: UUID
  vehicle_id: string
  type: VEHICLE_TYPE
  propulsion: PROPULSION_TYPE[]

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
  event_type: VEHICLE_EVENT

  event_type_reason: Nullable<VEHICLE_REASON>
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
