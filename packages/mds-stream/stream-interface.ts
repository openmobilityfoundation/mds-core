import { VehicleEvent, Telemetry, Device } from '@mds-core/mds-types'

export interface StreamProducer<TMessage> {
  initialize: () => Promise<void>
  write: (message: TMessage[] | TMessage) => Promise<void>
  shutdown: () => Promise<void>
}

export interface StreamConsumer {
  initialize: () => Promise<void>
  shutdown: () => Promise<void>
}

export interface AgencyStream {
  writeEvent: (event: VehicleEvent) => Promise<void>
  writeTelemetry: (telemetry: Telemetry[]) => Promise<void>
  writeDevice: (device: Device) => Promise<void>
  shutdown: () => Promise<void>
  initialize: () => Promise<void>
}
