import { VehicleEvent, Telemetry, Device } from '@mds-core/mds-types'

export interface StreamProducer {
  write: <T extends {}>(message: T[] | T) => Promise<void>
  shutdown: () => Promise<void>
  initialize: () => Promise<void>
}

export interface StreamConsumer {
  shutdown: () => Promise<void>
  initialize: () => Promise<void>
}

export interface AgencyStream {
  writeEvent: (event: VehicleEvent) => Promise<void>
  writeTelemetry: (telemetry: Telemetry[]) => Promise<void>
  writeDevice: (device: Device) => Promise<void>
  shutdown: () => Promise<void>
  initialize: () => Promise<void>
}
