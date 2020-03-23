import { VehicleEvent, Telemetry, Device } from '@mds-core/mds-types'
import { AgencyStream, StreamWriter } from '../stream-interface'
import { KafkaStreamWriter } from './write-stream'

const eventStream: StreamWriter = KafkaStreamWriter('mds.event')
const telemetryStream: StreamWriter = KafkaStreamWriter('mds.telemetry')
const deviceStream: StreamWriter = KafkaStreamWriter('mds.device')

const initialize = async () => {
  await Promise.all([eventStream.initialize(), telemetryStream.initialize(), deviceStream.initialize()])
}

const writeTelemetry = async (telemetry: Telemetry[]) =>
  Promise.all(telemetry.map(telem => telemetryStream.write(telem)))

const writeEvent = async (event: VehicleEvent) => eventStream.write(event)

const writeDevice = async (device: Device) => deviceStream.write(device)

const shutdown = () => Promise.all([eventStream.shutdown(), telemetryStream.shutdown(), deviceStream.shutdown()])

export const AgencyKafkaStream: AgencyStream = { initialize, writeEvent, writeTelemetry, writeDevice, shutdown }
