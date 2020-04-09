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

import { Telemetry, Timestamp, UUID, TelemetryData } from '@mds-core/mds-types'
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
  TelemetryLabeler
} from '../labelers'
import { StreamTransform, StreamProcessor } from './index'
import { KafkaSource, KafkaSink } from '../connectors/kafka-connector'

const { TENANT_ID } = getEnvVar({
  TENANT_ID: 'mds'
})

interface LabeledVehicleTelemetry extends DeviceLabel, GeographyLabel, LatencyLabel, TelemetryLabel {
  device_id: UUID
  provider_id: UUID
  telemetry_recorded: Timestamp
}

const [deviceLabeler, geographyLabeler, latencyLabeler, telemetryLabeler] = [
  DeviceLabeler(),
  GeographyLabeler(),
  LatencyLabeler(),
  TelemetryLabeler()
]

const processVehicleTelemetry: StreamTransform<
  Telemetry & { recorded: Timestamp },
  LabeledVehicleTelemetry
> = async telemetry => {
  const { device_id, provider_id, timestamp, recorded } = telemetry
  try {
    const [deviceLabel, latencyLabel, geographyLabel, telemetryLabel] = await Promise.all([
      deviceLabeler({ device_id }),
      geographyLabeler({ telemetry }),
      latencyLabeler({ timestamp, recorded }),
      telemetryLabeler({ telemetry })
    ])
    const transformed: LabeledVehicleTelemetry = {
      device_id,
      provider_id,
      telemetry_recorded: recorded,
      ...deviceLabel,
      ...geographyLabel,
      ...latencyLabel,
      ...telemetryLabel
    }
    return transformed
  } catch (error) {
    logger.error('Error processing telemetry', telemetry)
  }
  return null
}

export const VehicleTelemetryProcessor = StreamProcessor(
  KafkaSource<Telemetry & { gps: TelemetryData } & { recorded: Timestamp }>(`${TENANT_ID}.telemetry`, {
    groupId: 'mds-telemetry-processor'
  }),
  processVehicleTelemetry,
  KafkaSink<LabeledVehicleTelemetry>(`${TENANT_ID}.telemetry.annotated`, { clientId: 'mds-telemetry-processor' })
)
