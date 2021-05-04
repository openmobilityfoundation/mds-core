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
import { ClientDisconnectedError, getEnvVar } from '@mds-core/mds-utils'
import { AgencyStreamInterface } from '../agency-stream-interface'
import { NatsStreamProducer } from './stream-producer'

const { TENANT_ID } = getEnvVar({
  TENANT_ID: 'mds'
})
const deviceProducer = NatsStreamProducer<Device>(`${TENANT_ID}.device`)
const eventProducer = NatsStreamProducer<VehicleEvent>(`${TENANT_ID}.event`)
const telemetryProducer = NatsStreamProducer<Telemetry>(`${TENANT_ID}.telemetry`)
const tripMetadataProducer = NatsStreamProducer<TripMetadata>(`${TENANT_ID}.trip_metadata`)

export const AgencyStreamNats: AgencyStreamInterface = {
  initialize: async () => {
    await Promise.all([
      deviceProducer.initialize(),
      eventProducer.initialize(),
      telemetryProducer.initialize(),
      tripMetadataProducer.initialize()
    ])
  },
  writeEvent: async msg => {
    try {
      await eventProducer.write(msg)
    } catch (err) {
      if (err instanceof ClientDisconnectedError) {
        await eventProducer.initialize()
        await eventProducer.write(msg)
      }
    }
  },
  writeTelemetry: async msg => {
    try {
      await telemetryProducer.write(msg)
    } catch (err) {
      if (err instanceof ClientDisconnectedError) {
        await telemetryProducer.initialize()
        await telemetryProducer.write(msg)
      }
    }
  },
  writeDevice: async msg => {
    try {
      await deviceProducer.write(msg)
    } catch (err) {
      if (err instanceof ClientDisconnectedError) {
        await deviceProducer.initialize()
        await deviceProducer.write(msg)
      }
    }
  },
  writeTripMetadata: async msg => {
    try {
      await tripMetadataProducer.write(msg)
    } catch (err) {
      if (err instanceof ClientDisconnectedError) {
        await tripMetadataProducer.initialize()
        await tripMetadataProducer.write(msg)
      }
    }
  },
  shutdown: async () => {
    await Promise.all([
      deviceProducer.shutdown(),
      eventProducer.shutdown(),
      telemetryProducer.shutdown(),
      tripMetadataProducer.shutdown()
    ])
  }
}
