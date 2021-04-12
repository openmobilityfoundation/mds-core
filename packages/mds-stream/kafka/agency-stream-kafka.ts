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

import { VehicleEvent, Telemetry, Device, TripMetadata } from '@mds-core/mds-types'
import { getEnvVar } from '@mds-core/mds-utils'
import { KafkaStreamProducer } from './stream-producer'
import { AgencyStreamInterface } from '../agency-stream-interface'

const { TENANT_ID } = getEnvVar({
  TENANT_ID: 'mds'
})
const deviceProducer = KafkaStreamProducer<Device>(`${TENANT_ID}.device`)
const eventProducer = KafkaStreamProducer<VehicleEvent>(`${TENANT_ID}.event`)
const telemetryProducer = KafkaStreamProducer<Telemetry>(`${TENANT_ID}.telemetry`)
const tripMetadataProducer = KafkaStreamProducer<TripMetadata>(`${TENANT_ID}.trip_metadata`)

export const AgencyStreamKafka: AgencyStreamInterface = {
  initialize: async () => {
    await Promise.all([
      deviceProducer.initialize(),
      eventProducer.initialize(),
      telemetryProducer.initialize(),
      tripMetadataProducer.initialize()
    ])
  },
  writeEvent: eventProducer.write,
  writeTelemetry: telemetryProducer.write,
  writeDevice: deviceProducer.write,
  writeTripMetadata: tripMetadataProducer.write,
  shutdown: async () => {
    await Promise.all([
      deviceProducer.shutdown(),
      eventProducer.shutdown(),
      telemetryProducer.shutdown(),
      tripMetadataProducer.shutdown()
    ])
  }
}
