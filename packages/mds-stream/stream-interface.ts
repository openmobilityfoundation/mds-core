import { VehicleEvent, Telemetry, Device } from '@mds-core/mds-types'

export interface StreamWriter {
  write: (data: object) => void
  shutdown: () => void
  initialize: () => void
}

export interface StreamReader {
  shutdown: () => void
  initialize: () => void
}

export interface AgencyStream {
  writeEvent: (event: VehicleEvent) => Promise<void>
  writeTelemetry: (telemetry: Telemetry[]) => Promise<void[]>
  writeDevice: (device: Device) => Promise<void>
  shutdown: () => void
  initialize: () => void
}
