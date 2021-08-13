/**
 * Copyright 2021 City of Los Angeles
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

import { IdentityColumn, ModelMapper, RecordedColumn } from '@mds-core/mds-repository'
import { Device, Telemetry, VehicleEvent } from '@mds-core/mds-types'
import { DeviceEntityModel } from '../entities/device-entity'
import { EventEntityModel } from '../entities/event-entity'
import { TelemetryEntityModel } from '../entities/telemetry-entity'
import { MigratedEntityModel } from '../mixins/migrated-entity'

type MigratedEntityCreateOptions = {
  migrated_from: MigratedEntityModel
}

export type MigratedDeviceEntityCreateModel = Omit<DeviceEntityModel, keyof IdentityColumn>

export const MigratedDeviceToEntityCreate = ModelMapper<
  Device,
  MigratedDeviceEntityCreateModel,
  MigratedEntityCreateOptions
>(({ year = null, mfgr = null, model = null, accessibility_options = null, ...migrated }, options) => {
  const {
    migrated_from_source = null,
    migrated_from_version = null,
    migrated_from_id = null
  } = options?.migrated_from ?? {}

  return {
    year,
    mfgr,
    model,
    accessibility_options,
    migrated_from_source,
    migrated_from_version,
    migrated_from_id,
    ...migrated
  }
})

export type MigratedEventEntityCreateModel = Omit<EventEntityModel, keyof IdentityColumn>

export const MigratedEventToEntityCreate = ModelMapper<
  VehicleEvent,
  MigratedEventEntityCreateModel,
  MigratedEntityCreateOptions
>(({ telemetry, telemetry_timestamp = null, trip_id = null, trip_state = null, ...migrated }, options) => {
  const {
    migrated_from_source = null,
    migrated_from_version = null,
    migrated_from_id = null
  } = options?.migrated_from ?? {}

  return {
    telemetry_timestamp,
    trip_id,
    trip_state,
    migrated_from_source,
    migrated_from_version,
    migrated_from_id,
    ...migrated
  }
})

export type MigratedTelemetryEntityCreateModel = Omit<TelemetryEntityModel, keyof IdentityColumn>

export const MigratedTelemetryToEntityCreate = ModelMapper<
  Telemetry & Required<RecordedColumn>,
  MigratedTelemetryEntityCreateModel,
  MigratedEntityCreateOptions
>(
  (
    {
      gps: { lat, lng, speed = null, heading = null, accuracy = null, altitude = null, hdop = null, satellites = null },
      charge = null,
      stop_id = null,
      ...migrated
    },
    options
  ) => {
    const {
      migrated_from_source = null,
      migrated_from_version = null,
      migrated_from_id = null
    } = options?.migrated_from ?? {}

    return {
      lat,
      lng,
      speed,
      heading,
      accuracy,
      altitude,
      hdop,
      satellites,
      stop_id,
      charge,
      migrated_from_source,
      migrated_from_version,
      migrated_from_id,
      ...migrated
    }
  }
)
