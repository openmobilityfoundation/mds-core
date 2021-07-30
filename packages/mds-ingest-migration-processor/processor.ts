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

import {
  ConsoleSink,
  DeadLetterSink,
  KafkaSink,
  KafkaSource,
  StreamForwarder,
  StreamProcessor,
  StreamProcessorController,
  StreamSource
} from '@mds-core/mds-stream-processor'
import {
  convert_v0_4_1_device_to_1_0_0,
  convert_v0_4_1_vehicle_event_to_v1_0_0,
  convert_v1_0_0_device_to_1_1_0,
  convert_v1_0_0_vehicle_event_to_v1_1_0,
  Device_v0_4_1,
  Device_v1_1_0,
  Telemetry,
  VehicleEvent_v0_4_1,
  VehicleEvent_v1_1_0
} from '@mds-core/mds-types'
import { cleanEnv, str } from 'envalid'

const { SOURCE_TENANT_ID, TENANT_ID } = cleanEnv(process.env, { SOURCE_TENANT_ID: str(), TENANT_ID: str() })

type MigrationEntityType = 'devices' | 'events' | 'telemetry'
const MigrationTopic = (tenant: string, entityType: MigrationEntityType) => `${tenant}.${entityType}`

const MigrationDataSource: <MigrationSourceEntity>(entity: MigrationEntityType) => StreamSource<MigrationSourceEntity> =
  entity => {
    const topic = MigrationTopic(SOURCE_TENANT_ID, entity)
    return KafkaSource(topic, { groupId: `${topic}.ingest-migration-processor` })
  }

const MigrationErrorSink: <MigrationSourceEntity>(
  entity: MigrationEntityType
) => DeadLetterSink<MigrationSourceEntity> = entity => {
  const topic = `${MigrationTopic(TENANT_ID, entity)}.error`
  return KafkaSink(topic, {
    clientId: `${topic}.ingest-migration-processor`
  })
}

const DevicesMigrationProcessor = StreamProcessor<Device_v0_4_1 & { id: number }, Device_v1_1_0>(
  MigrationDataSource('devices'),
  async device => convert_v1_0_0_device_to_1_1_0(convert_v0_4_1_device_to_1_0_0(device)),
  [ConsoleSink()],
  [MigrationErrorSink('devices')]
)

const EventsMigrationProcessor = StreamProcessor<VehicleEvent_v0_4_1 & { id: number }, VehicleEvent_v1_1_0>(
  MigrationDataSource('events'),
  async event => convert_v1_0_0_vehicle_event_to_v1_1_0(convert_v0_4_1_vehicle_event_to_v1_0_0(event)),
  [ConsoleSink()],
  [MigrationErrorSink('events')]
)

const TelemetryMigrationProcessor = StreamForwarder<Telemetry & { id: number }>(
  MigrationDataSource('telemetry'),
  [ConsoleSink()],
  [MigrationErrorSink('telemetry')]
)

export const IngestMigrationProcessor = (): StreamProcessorController => {
  const processors = [DevicesMigrationProcessor, EventsMigrationProcessor, TelemetryMigrationProcessor]
  return {
    start: async () => {
      await Promise.all(processors.map(processor => processor.start()))
    },
    stop: async () => {
      await Promise.all(processors.map(processor => processor.stop()))
    }
  }
}
