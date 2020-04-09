/*
    Copyright 2019-2020 City of Los Angeles.

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

import {
  Nullable,
  NullableProperties,
  Timestamp,
  UUID,
  VEHICLE_EVENT,
  VEHICLE_REASON,
  VehicleEvent
} from '@mds-core/mds-types'
import logger from '@mds-core/mds-logger'
import { getEnvVar } from '@mds-core/mds-utils'
import {
  DeviceLabel,
  DeviceLabeler,
  GeographyLabel,
  GeographyLabeler,
  LatencyLabel,
  LatencyLabeler,
  TelemetryLabel,
  TelemetryLabeler,
  VehicleStateLabel,
  VehicleStateLabeler
} from '../labelers'
import { StreamTransform, StreamProcessor } from './index'
import { KafkaSource, KafkaSink } from '../connectors/kafka-connector'

const { TENANT_ID } = getEnvVar({
  TENANT_ID: 'mds'
})

interface LabeledVehicleEvent
  extends DeviceLabel,
    GeographyLabel,
    LatencyLabel,
    NullableProperties<TelemetryLabel>,
    VehicleStateLabel {
  device_id: UUID
  provider_id: UUID
  event_type: VEHICLE_EVENT
  event_type_reason: Nullable<VEHICLE_REASON>
  event_timestamp: Timestamp
  event_recorded: Timestamp
  trip_id: Nullable<UUID>
}

const [deviceLabeler, geographyLabeler, latencyLabeler, telemetryLabeler, vehicleStateLabeler] = [
  DeviceLabeler(),
  GeographyLabeler(),
  LatencyLabeler(),
  TelemetryLabeler(),
  VehicleStateLabeler()
]

const processVehicleEvent: StreamTransform<VehicleEvent, LabeledVehicleEvent> = async event => {
  const { device_id, provider_id, event_type, event_type_reason, timestamp, recorded, trip_id, telemetry } = event
  try {
    const [deviceLabel, geographyLabel, latencyLabel, telemetryLabel, vehicleStateLabel] = await Promise.all([
      deviceLabeler({ device_id }),
      geographyLabeler({ telemetry }),
      latencyLabeler({ timestamp, recorded }),
      telemetry ? telemetryLabeler({ telemetry }) : null,
      vehicleStateLabeler({ event_type })
    ])
    const transformed: LabeledVehicleEvent = {
      device_id,
      provider_id,
      event_type,
      event_type_reason: event_type_reason ?? null,
      event_timestamp: timestamp,
      event_recorded: recorded,
      trip_id: trip_id ?? null,
      ...deviceLabel,
      ...geographyLabel,
      ...latencyLabel,
      ...(telemetryLabel ?? {
        telemetry_timestamp: null,
        telemetry_lat: null,
        telemetry_lng: null,
        telemetry_altitude: null,
        telemetry_heading: null,
        telemetry_speed: null,
        telemetry_accuracy: null,
        telemetry_charge: null
      }),
      ...vehicleStateLabel
    }
    return transformed
  } catch (error) {
    logger.error('Error processing event', event)
  }
  return null
}

export const VehicleEventProcessor = StreamProcessor(
  KafkaSource<VehicleEvent>(`${TENANT_ID}.event`, { groupId: 'mds-event-processor' }),
  processVehicleEvent,
  KafkaSink<LabeledVehicleEvent>(`${TENANT_ID}.event.annotated`, { clientId: 'mds-event-processor' })
)
