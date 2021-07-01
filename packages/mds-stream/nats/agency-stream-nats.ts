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

import { Device, Telemetry, TripMetadata, VehicleEvent } from '@mds-core/mds-types'
import { getEnvVar } from '@mds-core/mds-utils'
import { AgencyStreamInterface } from '../agency-stream-interface'
import { safeWrite } from '../helpers'
import { NatsStreamProducer } from './stream-producer'

const { TENANT_ID } = getEnvVar({
  TENANT_ID: 'mds'
})
const deviceProducer = NatsStreamProducer<Device>(`${TENANT_ID}.device`)
const eventProducer = NatsStreamProducer<VehicleEvent>(`${TENANT_ID}.event`)
const eventErrorProducer = NatsStreamProducer<Partial<VehicleEvent>>(`${TENANT_ID}.event.error`)
const telemetryProducer = NatsStreamProducer<Telemetry>(`${TENANT_ID}.telemetry`)
const tripMetadataProducer = NatsStreamProducer<TripMetadata>(`${TENANT_ID}.trip_metadata`)

export const AgencyStreamNats: AgencyStreamInterface = {
  initialize: async () => {
    await Promise.all([
      deviceProducer.initialize(),
      eventProducer.initialize(),
      eventErrorProducer.initialize(),
      telemetryProducer.initialize(),
      tripMetadataProducer.initialize()
    ])
  },
  writeEventError: async msg => await safeWrite(eventErrorProducer, msg),
  writeEvent: async msg => await safeWrite(eventProducer, msg),
  writeTelemetry: async msg => await safeWrite(telemetryProducer, msg),
  writeDevice: async msg => await safeWrite(deviceProducer, msg),
  writeTripMetadata: async msg => await safeWrite(tripMetadataProducer, msg),
  shutdown: async () => {
    await Promise.all([
      deviceProducer.shutdown(),
      eventProducer.shutdown(),
      eventErrorProducer.shutdown(),
      telemetryProducer.shutdown(),
      tripMetadataProducer.shutdown()
    ])
  }
}
